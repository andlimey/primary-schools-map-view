## 1. OneMap routing client

- [x] 1.1 Add `ONEMAP_ROUTE_URL = "https://www.onemap.gov.sg/api/public/routingsvc/route"` to `src/p1data/config.py`.
- [x] 1.2 Add the `polyline` package (pure-Python, zero transitive deps) to `pyproject.toml` for decoding OneMap's encoded route geometry — used from `route_proxy` via `polyline.decode`, no hand-rolled decoder.
- [x] 1.3 Add `route(start, end, route_type, token, *, dt=None, max_walk_distance=2000, timeout=...) -> dict` to `src/p1data/onemap.py`. For `walk`/`drive`: send `start`, `end`, `routeType`, `Authorization` header; return the raw JSON. For `pt`: also send `date` (MM-DD-YYYY), `time` (HH:MM:SS), `mode=TRANSIT`, `numItineraries=1`, `maxWalkDistance`. No disk cache here (caching lives in the proxy).
- [x] 1.4 `tests/test_onemap.py`: `route` builds the correct query params / headers per `route_type` (monkeypatched `requests`); `pt` without a datetime raises. _(Polyline decoding is the `polyline` package's concern; `test_route_proxy` covers it end-to-end.)_

## 2. Shared OneMap token helper

- [x] 2.1 Extract the `_cached_token` + lazy-fetch + retry-once-on-401/403 logic from `src/schoolsmap/geocode_proxy.py` into `src/schoolsmap/onemap_token.py` exposing `get_token()` and `with_token(call)` (runs `call(token)`, re-auths once and retries on 401/403). Guard the module token with a `threading.Lock`.
- [x] 2.2 Rewrite `geocode_proxy.search` to use `onemap_token.with_token(...)`; keep its public signature and behaviour unchanged.
- [x] 2.3 `tests/test_geocode_proxy.py` still passes unchanged; add `tests/test_onemap_token.py` for the reuse + single-retry behaviour. _(token tests live in `tests/test_geocode_api.py`; repointed at `onemap_token` and still green; `tests/test_onemap_token.py` added.)_

## 3. Route proxy with in-memory cache

- [x] 3.1 Add `src/schoolsmap/route_proxy.py` with `Mode = Literal["walk", "transit", "drive"]` and `resolve_route(from_lat, from_lng, to_lat, to_lng, mode) -> RoutePayload`.
- [x] 3.2 `weekly_anchor(now=None) -> datetime` — 06:30 on the upcoming Monday (today if today is Monday) in `ZoneInfo("Asia/Singapore")`.
- [x] 3.3 Normalise OneMap's response into the payload: `mode`, `found`, `duration_seconds`, `distance_meters` (None for transit), `transfers` (None for walk/drive), `walk_seconds` (transit only), `walk_only` (bool), `legs: [{mode, route?, path: [[lat,lng],...]}]`. Walk/drive → single leg from `route_geometry`. Transit → fastest `plan.itineraries[0]`, one leg per `legs[]` entry decoded from `legGeometry.points` via `polyline.decode`; detect walk-only (`len(legs)==1 and legs[0].mode=="WALK"`). Missing route / empty itineraries → `found=False`.
- [x] 3.4 Hand-rolled cache: module-level `OrderedDict` `key -> (payload, expires_at)`, `threading.Lock`, `key = (round(from_lat,5), round(from_lng,5), round(to_lat,5), round(to_lng,5), mode, anchor.date().isoformat())`, `move_to_end` on hit, drop-and-miss on expiry, `popitem(last=False)` past `MAXSIZE = 1500`, `TTL = 7 * 24 * 3600`. Store OneMap's encoded strings in the entry; decode to arrays when returning.
- [x] 3.5 Route the OneMap call through `onemap_token.with_token(...)`.
- [x] 3.6 `tests/test_route_proxy.py` (fake OneMap call injected): walk/drive payload shape + single decoded leg; transit payload shape (no `distance_meters`, has `transfers`/`walk_seconds`, multi-leg); walk-only transit flagged; no-itinerary → `found=False`; second identical call served from cache (upstream called once); call after anchor rollover → cache miss; LRU eviction past `MAXSIZE`; `weekly_anchor` lands on Monday 06:30 SGT for several input dates.

## 4. API endpoint

- [x] 4.1 Add `RouteLeg`, `RouteResponse` Pydantic models and a `RouteMode` enum to `src/schoolsmap/api.py`.
- [x] 4.2 Add `get_route_resolver()` (returns `route_proxy.resolve_route`) and `get_route(from_: str, to: str, mode: RouteMode, resolve=Depends(...))` dependency that parses `"lat,lng"` strings (422 on malformed) and calls the resolver.
- [x] 4.3 Add `@app.get("/api/route", response_model=RouteResponse)`.
- [x] 4.4 `tests/test_api.py`: `/api/route?from=1.30,103.80&to=1.34,103.90&mode=walk` returns the payload (resolver faked); malformed `from`/`to` → 422; unknown `mode` → 422.

## 5. Frontend: data layer

- [x] 5.1 Add `frontend/src/map/travel.ts`: `TravelMode = 'walk' | 'transit' | 'drive'`, `RouteLeg`, `RouteResult` types, `MODE_LABELS`/icons, and `fetchRoute(from: LatLng, to: LatLng, mode: TravelMode): Promise<RouteResult>` calling `/api/route`.
- [x] 5.2 Add `useRoute(from, to, mode, enabled)` wrapping `useQuery` with key `['route', fromKey, toKey, mode]` and a long `staleTime` (server already caches a week).
- [x] 5.3 `travel.test.ts`: `fetchRoute` builds the right URL and parses the response; non-OK response rejects.

## 6. Frontend: travel section in the popup

- [x] 6.1 Add `frontend/src/map/TravelSection.tsx`: props `{ from: LatLng, to: LatLng, drawnMode: TravelMode | null, onToggleDraw: (m: TravelMode) => void }`. Collapsible (collapsed by default). On first expand, mounts the three `useRoute` hooks.
- [x] 6.2 Render one row per mode: walk/drive → `distance · time`; transit → `time · N transfers (incl. M min walk)`, or a walking-trip presentation when `walk_only`. Per-row loading spinner; per-row "Route unavailable" on error or `found === false`.
- [x] 6.3 Clicking a row calls `onToggleDraw(mode)`; the currently drawn row is visually marked as active.
- [x] 6.4 Show a muted caption: "Transit times for a typical school run (Mon 6:30am)".
- [x] 6.5 `TravelSection.test.tsx` (`useRoute`/fetch mocked): collapsed → no fetch; expand → three rows render from mocked data; one mode erroring shows one row error, others fine; `walk_only` transit renders as a walking trip; clicking a row fires `onToggleDraw`.

## 7. Frontend: route line on the map

- [x] 7.1 Add `frontend/src/map/RouteLayer.tsx`: props `{ from, to, mode }`; reads `useRoute(from, to, mode)`; renders one `<Polyline>` per leg — ride legs solid, walk legs dashed/muted; keyed by leg index. Renders nothing while loading or if `found === false`.
- [x] 7.2 In `frontend/src/map/SchoolMarker.tsx`: add a `searchedLocation: GeocodeCandidate | null` prop; add `drawnMode` state; render `<TravelSection>` inside the popup only when `searchedLocation` is set; render `<RouteLayer>` as a child of `<Marker>` (sibling of `<Popup>`) when `drawnMode` is set; add `popupclose` handler that resets `drawnMode` to `null`.
- [x] 7.3 In `frontend/src/map/MapView.tsx`: pass `searchedLocation` down to each `<SchoolMarker>`.
- [x] 7.4 Add `Polyline` to `frontend/src/test/react-leaflet-mock.tsx` as a plain element. _(Also taught the `Marker` mock to expose `eventHandlers` as hidden buttons so `popupclose` is testable.)_
- [x] 7.5 `SchoolMarker.test.tsx`: no `searchedLocation` → no travel section; with `searchedLocation` → travel section present; selecting a mode renders a `Polyline` (mocked) with that route's legs; `popupclose` removes it; selecting the drawn mode again removes it.

## 8. Verification

- [x] 8.1 `cd frontend && pnpm lint && pnpm test && pnpm build` all pass. (lint: only the pre-existing `button.tsx` fast-refresh warning; test: 39 passed; build: clean, `tsc -b` included)
- [x] 8.2 Backend: `pytest` passes (68 passed); no `ruff`/formatter configured.

> 8.3–8.6 are manual browser smoke-tests for the user to run against a deployment with live OneMap credentials. Their behavioural substance is covered by automated tests: 8.3/8.5 by `SchoolMarker.test.tsx` (section present only with a search) + `TravelSection.test.tsx` (three rows populate); 8.4 by `SchoolMarker.test.tsx` + `test_route_proxy.py` (second identical call served from cache); 8.6 by `TravelSection.test.tsx` (per-row error) + `test_route_proxy.py` (`found=False` path). Real-Leaflet polyline rendering and real OneMap timings still warrant a visual pass.
- [x] 8.3 Manual: with a searched address, open a nearby school → expand travel → three rows populate; open a school across an expressway → walk time is notably longer than the straight-line band suggests. _(Done — surfaced the route-drawing UX problems that Section 9 addresses.)_
- [ ] 8.4 Manual — **superseded by 9.12** (the drawing interaction changed): the first cut drew under the open popup with one blue line; re-verify against Section 9's behaviour instead.
- [ ] 8.5 Manual: open a school popup with no active search → no travel section.
- [ ] 8.6 Manual: temporarily break the OneMap call (bad creds) → each row shows "route unavailable", section and rest of popup still usable.

## 9. Route-drawing UX revision (after browser testing of the first cut)

> Sections 1–8 shipped the first cut: the route drew under the still-open popup as a single blue line. Browser testing showed the popup covers the line, the line doesn't read against OSM tiles, and walking legs appear to cross buildings. This section revises the drawing *surface* and *styling* only — `/api/route`, the cache, and the payload are unchanged. See design.md → "Route-drawing surface" and "Per-leg route colours".

- [x] 9.1 **Spike:** call `/api/route?...&mode=transit` for one real `(searched address, school)` pair whose fastest route includes an MRT leg; record what `leg.mode` and `leg.route` (or any other field) contain for the rail leg, and whether LRT reports as `SUBWAY` or `TRAM`. Feeds 9.2. Capture the raw JSON in the change folder or a comment. _(Findings: `spike-9.1-rail-leg-fields.md`. MRT = `mode:"SUBWAY"`, LRT = `mode:"TRAM"`; both carry the line code in `leg.route` (`"EW"`, `"BP"`, …). Bus = `mode:"BUS"`, `route` = service number. No backend change needed.)_
- [x] 9.2 Add `frontend/src/map/routeColors.ts`: the SG transit-line palette (NSL / EWL / NEL / CCL / DTL / TEL / LRT + one bus colour ≈ SBS lime + a neutral rail fallback), a walking blue and a driving blue, and `legStyle(leg: RouteLeg): { color, weight, dashArray? }` — WALK → dotted light blue; BUS → bus colour; rail → line colour via the field identified in 9.1, unknown code → fallback. Reconcile hex values against LTA branding / the rail-system Wikipedia infobox.
- [x] 9.3 `routeColors.test.ts`: WALK → dotted; BUS → bus colour; each known rail code → its colour; unknown rail code → fallback (still styled, not bare).
- [x] 9.4 Extract `formatDuration` / `formatDistance` / `formatTransfers` / `describeRoute` from `TravelSection.tsx` into `travel.ts` (or a new `travelFormat.ts`); point `TravelSection` at the shared helpers (no behaviour change — existing `TravelSection.test.tsx` still covers it).
- [x] 9.5 `RouteLayer.tsx`: for each leg render a white casing `<Polyline>` (`weight + ~3`, opaque, no dash) beneath the styled line from `legStyle(leg)`; drop the binary `isWalk` branch. Keep keying by leg index and the "nothing until loaded / `found === false`" guard.
- [x] 9.6 Lift active-route state to `MapView.tsx`: `activeRoute: { schoolId: number; mode: TravelMode } | null` + a setter enforcing one-at-a-time. Pass `activeRouteMode` (`activeRoute?.schoolId === school.id ? activeRoute.mode : null`) and `onToggleDraw` to each `<SchoolMarker>`.
- [x] 9.7 `SchoolMarker.tsx`: drop the local `drawnMode` state and the `popupclose → clear` handler; take `activeRouteMode` / `onToggleDraw` props; add a `useRef` on `<Marker>` and call `markerRef.current?.closePopup()` when a mode is selected; render `<RouteLayer>` when `activeRouteMode` is set. Rename the `TravelSection` prop `drawnMode` → `activeMode`.
- [x] 9.8 Add `frontend/src/map/RouteChip.tsx`: fixed-position card at `absolute bottom-2.5 right-2.5 z-[1000]` (mirrors `DistanceLegend`), shown when `activeRoute` is set — mode icon + school name + shared `describeRoute` text + a ✕ that clears `activeRoute`. Render it from `MapView` alongside `DistanceLegend`.
- [x] 9.9 `frontend/src/test/react-leaflet-mock.tsx`: the `Marker` mock exposes a `ref` carrying a `closePopup` `vi.fn()` (alongside the existing `eventHandlers` buttons).
- [x] 9.10 Update `SchoolMarker.test.tsx` for the prop rename, assert `closePopup()` fires on mode select and that the old `popupclose`-clears behaviour is gone. Add `RouteChip.test.tsx` (renders from `activeRoute`; ✕ calls the dismiss handler). Update/relocate whatever `MapView`-level test the lifted state needs.
- [x] 9.11 `cd frontend && pnpm lint && pnpm test && pnpm build` green; `pytest` still green (no backend change). _(vitest: 54 passed; lint: only the pre-existing `button.tsx` warning; build + `tsc -b`: clean; pytest: 66 passed.)_
- [ ] 9.12 Manual: draw each mode → popup closes, line is clearly visible over tiles (casing), chip shows in the corner; transit line colours match the MRT map; ✕ clears the route; drawing a second school's route replaces the first.
