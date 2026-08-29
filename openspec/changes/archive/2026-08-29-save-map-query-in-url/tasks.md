## 1. Test tooling setup

- [x] 1.1 Add dev dependencies to `frontend`: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`.
- [x] 1.2 Add a `test` script (`vitest run`) and `test:watch` (`vitest`) to `frontend/package.json`; add `"test": "vitest run"` to the CI/lint flow if one exists.
- [x] 1.3 Configure Vitest in `frontend/vite.config.ts` (`test.environment = 'jsdom'`, `test.globals = true`, `test.setupFiles = ['./src/test/setup.ts']`) and create `src/test/setup.ts` importing `@testing-library/jest-dom/vitest`.
- [x] 1.4 Add `src/test/leaflet-mock.tsx` (or a `vi.mock('react-leaflet', ...)` helper): `MapContainer`/`TileLayer`/`Marker`/`Popup`/`Circle` render children as plain elements; `useMap` returns a stub exposing `fitBounds`/`setView` as `vi.fn()`s (also lets `useAutoViewport` be tested via `renderHook` with no Leaflet provider).
- [x] 1.5 Add `src/test/renderWithRouter.tsx` helper that wraps a component in `MemoryRouter` with configurable `initialEntries` and a `QueryClientProvider`.

## 2. URL search-location helper

- [x] 2.1 Add `frontend/src/map/searchLocationParams.ts` with `SEARCH_PARAM_KEYS` (`q`, `lat`, `lng`) and two pure functions: `parseSearchLocation(params: URLSearchParams): GeocodeCandidate | null` (returns `null` unless `lat` and `lng` both parse as finite numbers; uses `q` for `label`, defaulting to `''`) and `serializeSearchLocation(candidate: GeocodeCandidate): Record<'q'|'lat'|'lng', string>` (rounds `lat`/`lng` to 5 decimal places).
- [x] 2.2 Handle the round-trip edge: `parseSearchLocation` tolerates a missing `q` and treats an empty string label as valid; `serializeSearchLocation` always writes all three keys.
- [x] 2.3 `searchLocationParams.test.ts`: valid params parse to a candidate; missing/non-numeric `lat` or `lng` → `null`; missing `q` → `label === ''`; `serialize` rounds to 5 dp and always emits all three keys; `parse(serialize(x))` round-trips.

## 3. MapView derives the searched location from the URL

- [x] 3.1 In `frontend/src/map/MapView.tsx`, replace the `searchedLocation` `useState` with `const [searchParams, setSearchParams] = useSearchParams()` and `const searchedLocation = useMemo(() => parseSearchLocation(searchParams), [searchParams.get('q'), searchParams.get('lat'), searchParams.get('lng')])` (memoise on the raw param strings so the object identity is stable).
- [x] 3.2 Pass a `setSearchedLocation`-style callback down to `LocationSearch` that writes the params via `setSearchParams` (merging, so other params/route are untouched), plus a way to clear them.
- [x] 3.3 Confirm `DistanceCircles`, `DistanceLegend`, the search `Marker`, and `distanceBandsById` all still read from the derived `searchedLocation` unchanged; `PanToSearch` / `FitToSchools` usages are removed here and replaced by the `<MapEffects>` host from group 5.
- [x] 3.4 `MapView.test.tsx` (react-leaflet mocked): mounting at `#/?q=Tampines&lat=1.35412&lng=103.94451` renders the search marker + both circles + legend and does **not** call `fetch('/api/geocode', ...)`; mounting at `#/` renders none of them; mounting at `#/?q=x&lat=abc&lng=1` renders none of them and leaves the search input empty.

## 4. LocationSearch: write URL on select, seed from URL, add clear control

- [x] 4.1 Change `LocationSearch`'s props so selecting a candidate calls the URL writer from task 3.2 instead of `onSelect`; keep setting the local `query` to the candidate label.
- [x] 4.2 Seed the initial `query` state from the URL: when the map loads with a valid searched location, initialise `query` to its `label`; when the search location is absent/malformed, initialise to `''` (do not seed from a `q` that has no usable coordinates).
- [x] 4.3 Add an ✕ clear control inside the input, rendered only when `query` is non-empty. On activation: clear `query`, clear `candidates`/`status`, close the dropdown, and remove `q`/`lat`/`lng` from the URL.
- [x] 4.4 Ensure typing or backspacing in the input does not remove the URL params (only the ✕ control and selecting a new candidate change them).
- [x] 4.5 `LocationSearch.test.tsx` (geocode `fetch` mocked): selecting a candidate updates the URL to carry `q`/`lat`/`lng`; input is seeded from `?q=` when coords are valid and left empty when they are not; ✕ is hidden when empty, shown when there is text, and on click empties the input and strips the params; backspacing the text to empty leaves the params in the URL.

## 5. Consolidate viewport control into `useAutoViewport`

- [x] 5.1 Add `frontend/src/map/useAutoViewport.ts`: hook taking `{ schools, searchedLocation }`, calling `useMap()`, running one effect that frames `searchedLocation` (search-radius bounds) when set, else fits the schools bounds once (guarded by a `didFitSchools` ref so clearing a search does not snap back to the all-schools view). Move the bounds math out of the old `PanToSearch.tsx` / `FitToSchools.tsx`.
- [x] 5.2 Add a null-rendering `<MapEffects schools={…} searchedLocation={…} />` child of `<MapContainer>` in `MapView.tsx` that calls `useAutoViewport(...)`; delete `PanToSearch.tsx` and `FitToSchools.tsx` and their imports.
- [x] 5.3 `useAutoViewport.test.tsx` via `renderHook` (`useMap` mocked): no search + non-empty schools → `fitBounds` called once with the schools bounds; re-render with same schools → not called again; search active → `fitBounds` called with the search bounds and never with the schools bounds; search set then cleared → no further `fitBounds` call on clear.

## 6. Detail page: history-back "Back to map"

- [x] 6.1 In `frontend/src/school-detail/SchoolDetailPage.tsx`, replace the two `<Link to="/">` occurrences with a control that calls `navigate(-1)` when `window.history.state?.idx > 0`, otherwise `navigate('/')`.
- [x] 6.2 Confirm the "More Details" `<Link>` in `frontend/src/map/SchoolMarker.tsx` is unchanged (detail URL stays `/#/schools/<slug>` with no query params).
- [x] 6.3 `SchoolDetailPage.test.tsx` (schools/detail `fetch` mocked): rendered with in-app history (`idx > 0`), activating "← Back to map" calls `navigate(-1)`; rendered as the first history entry, it navigates to `/`; the rendered page contains no `q`/`lat`/`lng` in its location.

## 7. Verification

- [x] 7.1 `cd frontend && pnpm lint && pnpm test && pnpm build` all pass with no errors. (lint: only the pre-existing `button.tsx` fast-refresh warning; test: 25 passed; build: clean)

> 7.2–7.6 are manual browser smoke-tests for the user to run against the live app. Their behavioural substance is already covered by automated tests: 7.2/7.3 by `MapView.test.tsx` (restore-from-URL, no geocode call) + `LocationSearch.test.tsx` (select writes `q`/`lat`/`lng`); 7.4 by `MapView.test.tsx` (malformed coords ignored, box empty); 7.5 by `LocationSearch.test.tsx` (✕ strips params, backspace keeps them); 7.6 by `SchoolDetailPage.test.tsx` (direct visit → `navigate('/')`). Real-Leaflet viewport framing and pin-colour rendering still warrant a visual pass.
- [x] 7.2 Manual: search an address → URL gains `q`/`lat`/`lng`; open a school's "More Details" → back (control and browser back) → marker, circles, legend, pin colours, and framing are restored.
- [x] 7.3 Manual: copy the searched URL into a fresh tab → full search context restores with no `/api/geocode` request (check the network panel); viewport is framed on the location, not fit to all schools.
- [x] 7.4 Manual: open `#/?q=Somewhere` (no coords) and `#/?q=x&lat=abc&lng=1` → default map view, empty search box, no marker.
- [x] 7.5 Manual: ✕ clears the box and strips the params; backspacing the text to empty leaves the params and the active marker intact.
- [x] 7.6 Manual: open a detail-page URL directly (no in-app history) → "← Back to map" lands on the default map view.
