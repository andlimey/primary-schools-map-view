## 1. Backend: OneMap token cache

- [x] 1.1 Add a small module (e.g. `src/schoolsmap/geocode_proxy.py`) holding an in-memory cached OneMap token: lazy-fetch via `onemap.get_token()` on first use, reused across requests.
- [x] 1.2 On an auth failure from `onemap.search()` (e.g. the upstream response indicates an invalid/expired token), clear the cached token, re-authenticate once, and retry the request.
- [x] 1.3 Read `ONEMAP_EMAIL`/`ONEMAP_PASSWORD` the same way `geocode_main.py` does; fail fast at first use (not at import time) with a clear error if they're unset.

## 2. Backend: `/api/geocode` endpoint

- [x] 2.1 Add a `GeocodeCandidate` response model (`label`, `latitude`, `longitude`) in `src/schoolsmap/api.py`.
- [x] 2.2 Add `GET /api/geocode?q=<query>`: call `onemap.search(query, token, cache_dir=None)` via the token-cache module, map each result to a `GeocodeCandidate` (`label` from `ADDRESS`), and return the list as-is (no re-ranking, no filtering).
- [x] 2.3 Return an empty list (not an error) when OneMap finds no matches.
- [x] 2.4 Enforce a minimum query length server-side as a defensive floor (mirrors the client-side debounce/min-length, doesn't replace it).

## 3. Backend tests

- [x] 3.1 Add `tests/test_geocode_api.py` following the `TestClient` + `dependency_overrides` pattern in `tests/test_api.py`: mock/stub the OneMap call boundary (don't hit the real OneMap API in tests).
- [x] 3.2 Test: multiple candidates returned for a query resolving to several results.
- [x] 3.3 Test: empty list returned for a query with no matches.
- [x] 3.4 Test: a cached token is reused across two sequential requests (the token-fetch function is called once, not twice).
- [x] 3.5 Test: an auth-failure response triggers exactly one re-authentication and a retry.

## 4. Frontend: search input + candidate list

- [x] 4.1 Add a `LocationSearch` component: text input overlaid on the map (top-left, matching the existing overlay-on-map convention), debounced (~300ms) with a minimum query length (2-3 chars) before firing a request.
- [x] 4.2 Fetch `/api/geocode?q=...` on debounced input change; abort/ignore stale in-flight requests when a newer query supersedes them.
- [x] 4.3 Render candidates in a listbox below the input, each labeled with its address; support keyboard navigation (arrow keys, Enter to select, Escape to close) and mouse selection.
- [x] 4.4 Show an inline "no results" state when a query resolves to zero candidates, and an inline error state if the request fails.

## 5. Frontend: pan/zoom and marker

- [x] 5.1 Add a `PanToSearch` component (mirroring the existing `FitToSchools` in `frontend/src/App.tsx`) that takes a selected location and computes a bounding box using the 3km lat/lng offset formula from design.md, then calls `map.fitBounds()`.
- [x] 5.2 Wire `LocationSearch`'s candidate-selection callback to set the searched-location state in `App`, which `PanToSearch` reacts to.
- [x] 5.3 Render a marker at the searched location using an icon visually distinct from the school pin icon (different color/shape), with a popup or label showing the resolved address.
- [x] 5.4 Confirm existing behavior is unaffected: initial load still runs `FitToSchools` over all schools before any search happens.

## 6. Manual verification

- [x] 6.1 Run the app locally (`schools-map-api` or the Vite dev server) and search a known postal code that resolves to multiple candidates (e.g. one shared by several buildings) — confirm the dropdown shows distinguishable options.
- [x] 6.2 Select a candidate and confirm the map pans/zooms so a 3km radius around it is visible, on both a wide and a narrow browser window.
- [x] 6.3 Confirm the searched-location marker is visually distinct from school pins.
- [x] 6.4 Search a nonsense query and confirm the "no results" state appears without disturbing the current map view.
- [x] 6.5 Confirm no OneMap token or credential value appears in the browser's network tab for `/api/geocode` requests/responses.
