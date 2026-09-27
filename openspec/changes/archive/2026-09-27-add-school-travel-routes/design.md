## Context

**Current popup.** `frontend/src/map/SchoolMarker.tsx` renders the popup: name, address, a collapsible admissions table (`expanded` state, default open), and a "More Details" link. It receives `distanceBand` (a `'within-1km' | 'within-2km' | null`) but not the searched location itself. The searched location is derived in `MapView.tsx` from the URL (`parseSearchLocation`) as a `GeocodeCandidate` (`{ label, latitude, longitude }`) and drives `DistanceCircles`, `DistanceLegend`, pin colours, and viewport framing.

**Current OneMap integration.** `src/schoolsmap/geocode_proxy.py` holds a module-level `_cached_token`, lazily fetched via `src/p1data/onemap.py:get_token`, reused across `/api/geocode` calls, re-fetched once on a 401/403. `src/p1data/onemap.py:search` calls `https://www.onemap.gov.sg/api/common/elastic/search` with `headers={"Authorization": token}`. The FastAPI endpoints are sync `def` with `Depends`-injected proxy callables (`get_geocode_search`), which makes them trivially testable with a fake.

**OneMap Routing API.** `GET https://www.onemap.gov.sg/api/public/routingsvc/route`, same `Authorization: <token>` header.
- `routeType=walk` / `routeType=drive`: params `start=lat,lng`, `end=lat,lng`. Response: `route_summary.total_time` (seconds), `route_summary.total_distance` (metres), `route_geometry` (Google encoded polyline, precision 5).
- `routeType=pt`: additional params `date=MM-DD-YYYY`, `time=HH:MM:SS`, `mode=TRANSIT`, `numItineraries=1`, `maxWalkDistance=<m>`. Response: `plan.itineraries[]`; each has `duration`, `walkTime`, `transitTime`, `waitingTime`, `walkDistance` (seconds / metres), `transfers` (int), and `legs[]` — each leg has `mode` (`WALK`, `BUS`, `SUBWAY`, …), `duration`, `distance`, `route` (service short name), and `legGeometry.points` (encoded polyline).

**Deployment.** Single Fly machine, `sin` region, 256 MB RAM, `min_machines_running = 0` (scale-to-zero via machine *stop*, not destroy). No persistent volume. `requests` is sync; sync FastAPI endpoints run in the anyio worker threadpool, so shared mutable state needs a lock.

**Route-drawing UX revision (after the first cut shipped).** Browser testing of Sections 1–8 surfaced three problems, all rooted in drawing the route *under* a still-open Leaflet `Popup`: (1) the opaque popup `Card` sits in `popupPane` (z-index 700), always above the `<Polyline>` in `overlayPane` (400), so it hides the route — worst near the destination pin the popup is anchored to; (2) a single mid-blue line at weight 3–5 does not read against OSM's busy raster palette and conveys no information; (3) some walking legs visually cross building footprints — plausibly legitimate void-deck / linkway paths that OSM renders as solid blocks, plausibly a router graph-gap beeline; not resolvable without inspecting a live response, and either way a trust problem the UI should hedge rather than pretend precision. Section 9 of tasks.md revises the drawing *surface* and *styling*; the data path (`/api/route`, the cache, the payload) is unchanged.

## Goals / Non-Goals

**Goals**

- One endpoint that returns, for an (origin, destination, mode) triple, everything the popup and the map line need: time, distance (walk/drive), leg-by-leg geometry, and transit's transfers + walk portion.
- Transit results that are stable and comparable across schools and across days — a "typical school run" rather than "whatever the timetable says at the moment you clicked".
- Repeat clicks around the same searched address are nearly free (cache).
- The route section costs nothing until a user opens it.
- Route drawing without adopting a new map library.

**Non-Goals**

- Live/traffic-aware driving times. OneMap `drive` is free-flow; ERP and congestion are not modelled. Not surfaced as a caveat in v1 unless it proves misleading.
- Cross-instance or persistent route cache. In-process only; a scale-to-zero wake starts cold.
- Choosing between bus-only and bus+rail. `mode=TRANSIT` (fastest of either) is used; "Transit", not "Bus".
- Persisting the drawn route or selected mode in the URL.
- Turn-by-turn instructions, elevation profiles, animated/directional route lines. Possible later. (MRT-line colouring: **now in scope** — see "Per-leg route colours".)
- A full responsive side panel / bottom sheet for school detail. Considered and rejected for now — see "Route-drawing surface".
- Adding the travel section to the search-marker popup — school popups only.
- Converting the OneMap token cache to anything shared with a TTL of its own (it already works; only lightly refactored to be callable from two proxies).

## Decisions

### Decision: OneMap Routing API is the data source, via a new server-side proxy

Reuse the token machinery that `/api/geocode` already has. Routing must be server-side regardless — the token cannot ship to the browser.

**Endpoint:** `GET /api/route?from=<lat>,<lng>&to=<lat>,<lng>&mode=walk|transit|drive`. One mode per request; the frontend fires three in parallel via React Query, matching how it already fans out independent fetches.

**Normalised response** (mode-independent shape so the client stays dumb):

```jsonc
{
  "mode": "transit",
  "found": true,               // false => no route; rows render an inline "unavailable"
  "duration_seconds": 1320,
  "distance_meters": 2410,     // null for transit
  "transfers": 1,              // null for walk/drive
  "walk_seconds": 360,         // transit only: on-foot portion; null otherwise
  "walk_only": false,          // transit itinerary that is entirely walking
  "legs": [
    { "mode": "WALK", "path": [[1.34,103.9], …] },
    { "mode": "BUS",  "route": "185", "path": [[…]] }
  ]
}
```

**Alternatives considered:**
- *OSRM / GraphHopper / Mapbox Directions* — OSRM's public server bans production use and has no public transport; the others need their own keys and still no SG transit. OneMap is the natural fit: Singapore-specific, PT included, token infra already built, and already covered by the project's OneMap terms.
- *Client-side routing* — impossible without leaking the token.

### Decision: decode the polyline server-side with the `polyline` library; return plain coordinate arrays

OneMap returns Google-encoded polylines (`route_geometry` for walk/drive, per-leg `legGeometry.points` for transit). `route_proxy` decodes them with the `polyline` PyPI package (`polyline.decode`, precision-5 default) and hands the frontend `[[lat, lng], …]` per leg. Decoding server-side keeps the encoding detail out of the UI and avoids a JS polyline dependency.

**Why the library over a hand-rolled decoder:** `polyline` is pure-Python, MIT, with zero transitive dependencies, and the encoding is a frozen spec so the package is effectively stable. Preferred over owning ~15 lines of bit-twiddling that would need its own test vector.

### Decision: transit routing uses a fixed weekly anchor — Monday 06:30, Asia/Singapore

`pt` requires `date` + `time`. Using "now" makes an 11pm query return a scary number and defeats caching. Using a canonical school-run slot gives a stable, comparable answer.

- **Anchor = the coming Monday at 06:30 SGT** (today, if today is Monday). Computed with `zoneinfo.ZoneInfo("Asia/Singapore")`. The exact date is not load-bearing — bus/MRT timetables are weekly-cyclical — it just has to be a valid near-future weekday that OneMap accepts.
- `maxWalkDistance = 2000`. Default is 1000; schools up to 2km out with thin bus coverage otherwise return *no* itinerary. Better a walk-heavy itinerary than an empty row.
- `numItineraries = 1` — take the fastest.
- **Walk-only itinerary** (`legs.length === 1 && legs[0].mode === 'WALK'`) → `walk_only: true`; the row renders as "Walk — N min (no bus needed)". It will roughly equal the dedicated walk row; that is reassuring, not a bug.
- **Transit distance is omitted.** There is no clean single "trip distance" (only `walkDistance` and per-leg values), and it is not a number anyone acts on. The row shows time, `transfers`, and `walk_seconds` ("incl. 6 min walk").

**UI note:** one muted line under the section — "Transit times for a typical school run (Mon 6:30am)".

**Alternatives considered:** "now" (rejected: unstable, uncacheable, misleading off-peak); user-selectable time (rejected: over-built for a popup); next weekday rolling daily (rejected: busts the cache daily for no benefit — see cache decision).

### Decision: in-memory route cache in a new `route_proxy.py`, 7-day TTL, LRU-bounded

Mirrors `geocode_proxy.py`'s module-level state. Because the anchor is a fixed weekly slot and roads/timetables barely move, a resolved route is effectively constant for a week.

- **Key:** `(round(from_lat, 5), round(from_lng, 5), round(to_lat, 5), round(to_lng, 5), mode, anchor_date_iso)`. 5 dp ≈ 1 m; geocoder results are discrete so real users produce exact-repeat keys. The anchor in the key means last week's entries become unreachable and age out.
- **TTL: 7 days.** Not really a freshness guard (the data doesn't change) — a safety valve so entries can't live forever.
- **Bound: LRU, `maxsize ≈ 1500`.** Protects the 256 MB VM against a user hammering many coordinates.
- **Structure:** hand-rolled — module-level `OrderedDict` of `key -> (payload, expires_at)`, a `threading.Lock`, `move_to_end` on hit, `popitem(last=False)` when over capacity, drop-and-miss on expiry. ~25 lines, no new dependency, consistent with the existing hand-rolled token cache.
- **Payload stored compact:** keep OneMap's encoded polyline strings in the cache entry, decode to arrays on the way out — each entry stays ~1 KB rather than several.

**Consequence — cold on scale-to-zero.** The first person to expand a travel section after the machine has been idle pays full OneMap latency ×3 (plus a token fetch if that is also cold); everyone after, warm, until the next sleep. Acceptable: the feature is lazy and non-critical, and the VM is in `sin` so OneMap RTT is low. If cold-wake latency ever bites, the fallback is a disk cache under `cache/routes/*.json` (exactly like `src/p1data/onemap.py` already does for geocoding — Fly's machine filesystem survives stop/start). Not built now.

**Alternatives considered:** `cachetools.TTLCache` (fine, but adds a dependency to a deliberately lean 6-dep project for ~25 lines saved); Redis / external (absurd for one scale-to-zero machine); no cache (re-hits OneMap on every popup click around the same address).

### Decision: reuse the OneMap token across both proxies via a shared helper

Extract the `_cached_token` + "fetch once, retry once on 401/403" logic from `geocode_proxy.py` into a small `src/schoolsmap/onemap_token.py` (or a shared function) that both `geocode_proxy` and `route_proxy` call. One token, one re-auth path, credentials never leave the server — the existing `location-search` guarantees now cover routing too.

### Decision: lazy fetch on expand; React Query per mode; independent rows

Nothing is fetched on popup open or map load. Expanding the section mounts three `useRoute(from, to, mode)` hooks (`useQuery`, key `['route', fromKey, toKey, mode]`). Each row shows its own loading spinner, its own result, or its own inline "Route unavailable" — a 500 or a `found: false` on one mode never collapses the section. React Query gives dedupe + caching (a re-expand or a second popup for a nearby school reuses in-flight/settled data) for free, matching the admissions and detail-prefetch patterns already in the app.

`from === to` is not a real case (identical coordinates would mean no search was performed), but the endpoint still returns a degenerate near-zero route rather than erroring, defensively.

### Decision: draw routes with Leaflet `<Polyline>` — do not adopt react-map-gl

| Factor | Leaflet (current) | react-map-gl / MapLibre |
|---|---|---|
| Draw a route path | `<Polyline positions={leg.path}>`, already in the dep tree | `<Source>` + `<Layer>` GeoJSON |
| Base tiles | OSM raster, **no key** (the project's stated "no API key required") | needs a vector tile source — MapTiler/Mapbox key or self-host |
| Migration cost | zero | rewrite `MapView`, `SchoolMarker`, `DistanceCircles`, `useAutoViewport`, `leaflet-icons`, every map test + the react-leaflet mock |
| Gain for this feature | — | none — smooth vector zoom / 3D / WebGL perf at 10k+ features, none of which apply to ~180 markers + a handful of lines |

react-map-gl solves problems this app does not have, at the cost of a full map-layer rewrite plus a tile-provider key. Revisit only if turn-by-turn styling or many simultaneous routes ever become requirements.

**Mechanics** (revised — see "Route-drawing surface" and "Per-leg route colours" below). `<RouteLayer>` still renders `<Polyline>`s from decoded `leg.path` arrays and shares React Query's cached geometry with the rows. What the first cut did and Section 9 changes: the active route was per-`SchoolMarker` state and stayed drawn *under* the open popup with a single blue line, cleared on `popupclose`. It becomes one piece of state owned by `MapView`; selecting a mode closes the popup and shows a fixed-position summary chip; legs are coloured by service with a casing for legibility. The viewport is left alone (the clicked school is already on screen).

### Decision: drawing a route closes the popup and shows a fixed-position "route chip"

The first cut drew the route while the popup stayed open, so the popup (opaque, `popupPane` z-index 700) covered the line (`overlayPane` 400). No z-order tweak fixes this cleanly — a custom pane above 700 would draw the line *over the popup card's text*. The fix is to stop the two sharing the screen:

- **Selecting a mode row closes the popup** (`marker.closePopup()` via a `ref`), leaving the whole route — including the stretch by the destination pin — visible.
- **A `RouteChip` carries the summary** — a fixed-position card (`absolute bottom-2.5 right-2.5`, opposite corner from `DistanceLegend` at `bottom-2.5 left-2.5`, which is visible at the same time). Shows the mode icon, school name, the same "18 min · 1.4 km" text the popup rows render (helpers extracted from `TravelSection` and shared), and a ✕. Mirrors an existing pattern — `DistanceLegend` is already a screen-fixed overlay unrelated to any marker.
- **The chip's ✕ is the primary "stop showing this route" action.** Re-clicking the same row to toggle off is no longer a practical path (the row sits behind a closed popup); reopening the popup and choosing a different mode still replaces the route.

**State moves up to `MapView`.** The first cut kept `drawnMode` local to each `SchoolMarker`; "one route at a time across the whole map" held only because Leaflet's `Popup autoClose` default happened to fire the old `popupclose`→clear wiring. A single global chip has no per-marker home, and the invariant deserves to be explicit — so `MapView` owns `activeRoute: { schoolId, mode } | null` and passes `activeRouteMode` + `onToggleDraw` down. `SchoolMarker` stays presentational, as it already is for `searchedLocation` / `admissionsById`.

**Alternatives considered:**
- *Auto-shrink the popup to a stub instead of closing it* — still an anchored overlay that can overlap the line; a half-measure.
- *Full responsive side panel / bottom sheet* (Google Maps style) — the textbook answer for "map + persistent detail on any screen size", but it displaces the lightweight tap-and-glance popup mobile parents rely on for admissions, and is a large structural bet for a three-row feature. Revisit if the travel section grows (turn-by-turn, multi-school compare).
- *Custom Leaflet pane for the route above `popupPane`* — the line then draws across the popup card itself; worse.

### Decision: colour route legs — Singapore transit-line palette, blue for walk/drive, white casing throughout

A single blue line does not read against OSM raster tiles and carries no information. Instead:

- **Every leg is two `<Polyline>`s** — a white casing underneath (`weight + ~3`, opaque, no dash) and the coloured line on top. The Google/Apple Maps technique; contrast becomes structural (white vs. anything) rather than hue-dependent, so it survives any basemap and softens problem 3 (an odd segment reads as "a drawn line", not "a road through a wall").
- **Transit ride legs coloured by service:** MRT/LRT legs in the official line colours (NSL red, EWL green, NEL purple, CCL orange, DTL blue, TEL brown, LRT grey); bus legs in one representative "bus green" (≈ SBS lime). OneMap gives `mode=BUS` + a service number, not the operator, so per-operator liveries aren't attempted.
- **Walking** (its own route, and the walk sub-legs of a transit itinerary): dotted, lighter blue — reads as "approximate connector", which also hedges problem 3.
- **Driving:** solid, saturated blue. Only one mode is ever drawn at once, so walk-blue / drive-blue / DTL-blue never collide on screen; the shared hue is a cross-view consistency choice, not a rendering clash.
- **Unknown / unmapped rail line code:** neutral grey fallback — never an unstyled line.

`legStyle(leg)` in a new `routeColors.ts` owns the mapping and is unit-tested (mode → style, unknown code → fallback).

**Open dependency:** what a OneMap transit `leg` carries to identify *which* rail line (and whether LRT comes back as `SUBWAY` or `TRAM`) is unverified — `leg.route` holds the bus service number for bus legs, but its content for rail legs is unknown. Needs a one-off inspection of a live transit response with an MRT leg before the line→colour table keys are fixed (task 9.1). The hex values above are best-recollection, to be reconciled against LTA branding.

## Risks / Trade-offs

- **256 MB RAM + cache growth** → LRU `maxsize ≈ 1500`, encoded-polyline payloads (~1 KB), per-leg arrays only materialised on response.
- **Cold cache on every scale-to-zero wake** → accepted (lazy, non-critical, `sin` region); disk-cache fallback documented but not built.
- **OneMap routing outage / rate limit** → per-row `found:false` / error, section stays usable; cache + weekly anchor keep call volume low; three modes fetched in parallel by the client, one upstream call each.
- **`pt` returns no itinerary even at `maxWalkDistance=2000`** (remote school, no service at 06:30) → `found:false`, row shows "Transit route unavailable".
- **Encoded-polyline decode correctness** (precision, sign handling) → delegated to the `polyline` package; `test_route_proxy` still asserts decoded coordinates end-to-end through a known geometry string.
- **Sync `requests` in the threadpool touching the module cache** → `threading.Lock` around every cache read/write and around the token cache in the shared helper.
- **Anchor date drifts (Mon → next Mon) mid-week** → anchor is in the cache key, so the rollover is a clean generational cache miss, not a correctness bug; old entries age out via LRU/TTL.
- **react-leaflet test mock lacks `Polyline`** → add it to `src/test/react-leaflet-mock.tsx` as a plain element (like `Circle`); the `Marker` mock also gains a `ref` stub exposing `closePopup` (Section 9).
- **Active-route state lifted to `MapView` (Section 9)** → `SchoolMarker` unit tests move to prop-driven fakes (`activeRouteMode` / `onToggleDraw`), matching the existing pattern; low risk, the component was already presentational.
- **"Walking route cuts through a building"** → cannot be diagnosed from here (legitimate void-deck path vs. router beeline); mitigated by dotted low-emphasis walk styling + the existing "approximate, verify on SchoolFinder" voice, not by trying to correct OneMap's geometry client-side.
- **Chip and `DistanceLegend` share the bottom edge** → legend left, chip right; both ~260px, fine side-by-side on desktop, may stack tightly on a narrow phone — acceptable, the chip is transient and dismissible.
- **Driving time ignores traffic/ERP** → v1 accepts free-flow; revisit copy if user feedback says it misleads.

## Migration Plan

Purely additive, single deploy. No DB change, no new secret (reuses `ONEMAP_EMAIL` / `ONEMAP_PASSWORD`). One new pure-Python runtime dependency (`polyline`), picked up by the Docker image's existing `uv sync --frozen --no-dev`. Rollback is a straight revert: `/api/route` disappears (404, and the frontend section is gone with it), no persisted state to unwind, existing URLs and the geocoding path untouched. The Section 9 revision is likewise frontend-only and additive over the first cut — no API or payload change.

## Open Questions

- **Monday selection when it is currently Monday after 06:30** — use today's (past-time) date or roll to next Monday? Cosmetic; OneMap accepts same-day past times and returns schedule-based results. Lean: use today; revisit if OneMap rejects it.
- **Surface a free-flow-traffic caveat on the drive row?** Deferred pending real usage.
- **Rail leg line identity** — which field on a OneMap transit `leg` names the MRT/LRT line, and whether LRT is `SUBWAY` or `TRAM`. Blocks finalising the line→colour table; needs one live response inspected (task 9.1).
- **Exact SG transit-line hex values** — best-recollection for now; reconcile against LTA's brand guide / the rail-system Wikipedia infobox before shipping (task 9.2).
