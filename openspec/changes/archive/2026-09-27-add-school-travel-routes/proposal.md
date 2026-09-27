## Why

The map already tells a parent how *far* a school is as the crow flies (pin colour, 1km/2km circles), but not how *reachable* it is. A school 1.2km away across a canal or an expressway can be a 25-minute walk or two buses. When a search location is active, the popup is the natural place to answer "how do I actually get there, and how long does it take?" — for walking, public transport, and driving — and to show the route on the map.

## What Changes

- **New `GET /api/route` endpoint** proxying OneMap's Routing API (reusing the existing server-side OneMap token, same as `/api/geocode`). Given an origin, a destination, and a mode (`walk` / `transit` / `drive`), it returns travel time, distance (walk/drive only), and the route geometry as an ordered list of legs; for transit it also returns transfer count and the walking portion.
- **Transit routes use a fixed weekly "school-run" time** — 06:30 on the coming Monday, Asia/Singapore — instead of wall-clock now, so results are stable, comparable, and cacheable. Walking and driving are time-independent. The UI states the reference time.
- **Resolved routes are cached in process memory** keyed by rounded origin, rounded destination, mode, and the weekly anchor; 7-day TTL, LRU-bounded. Cold on a scale-to-zero wake (accepted).
- **The school popup gains a search-gated "travel" section**, collapsed by default, appearing only when a search location is active. Expanding it lazily fetches all three modes; each row loads and fails independently.
- **A transit itinerary that is walk-only is shown as a walking trip** ("no bus needed"); the transit row otherwise shows time, transfers, and the walking portion, and omits total distance.
- **Click-to-draw route lines on the map.** Selecting one mode row draws that route's path (following the router's geometry) as Leaflet polylines; at most one at a time, across all schools.
  - Selecting a mode **closes the popup** (so it can't cover the line) and shows a **dismissible summary chip** fixed to a map corner — mirroring the existing `DistanceLegend` pattern. The chip's ✕ is the primary way to clear the route. _(Revised after browser testing of the first cut — see design.md "Route-drawing surface".)_
  - **Legs are coloured by service**: MRT/LRT legs in their official line colours, bus legs in one bus colour, walking as a dotted line, each with a white casing so the route stays legible over OSM tiles.
- **No frontend map-library change.** Leaflet stays; `<Polyline>` covers this. (react-map-gl evaluated and rejected — see design.)

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `schools-map-api`: adds a route proxy endpoint; a fixed weekly time for transit routing; an in-memory route cache; and reuse of the OneMap token/credentials-stay-server-side guarantees for routing.
- `schools-map-view`: the popup's "identifying info on interaction" requirement gains a search-gated travel section; new requirements for showing per-mode distance/time (lazy, independently failing), for drawing a selected route on the map (popup closes, dismissible corner chip, one at a time), and for rendering that route legibly with service-coloured legs.

## Impact

- **Backend:** `src/schoolsmap/api.py` (new endpoint + Pydantic models), new `src/schoolsmap/route_proxy.py` (route resolution + in-memory cache), `src/p1data/onemap.py` (add `route()` call), a small shared OneMap-token helper extracted from `src/schoolsmap/geocode_proxy.py`. One new runtime dependency: `polyline` (pure-Python, zero transitive deps) to decode OneMap's encoded route geometry; the cache stays hand-rolled, matching the existing token cache.
- **Frontend:** new `frontend/src/map/travel.ts` (types + `fetchRoute`), `TravelSection.tsx`, `RouteLayer.tsx`, `routeColors.ts` (leg styling), `RouteChip.tsx` (corner summary); `SchoolMarker.tsx` gains a `searchedLocation` prop and is driven by `MapView`-owned active-route state; `MapView.tsx` owns `activeRoute` and renders the chip; `src/test/react-leaflet-mock.tsx` adds `Polyline` and a `Marker` `closePopup` ref stub.
- **Ops:** reuses the `ONEMAP_EMAIL` / `ONEMAP_PASSWORD` secrets already set on Fly for geocoding — nothing new to provision. OneMap Routing API is covered by the same OneMap terms already noted in the project's licensing.
- **Rollback:** additive and behind an active search — a straight revert removes the endpoint and the popup section with no data or URL migration.
