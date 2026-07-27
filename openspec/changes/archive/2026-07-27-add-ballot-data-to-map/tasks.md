## 1. Backend: bulk most-recent-year admissions endpoint

- [x] 1.1 Add `get_latest_admissions(conn)` to `src/p1data/db.py`: resolve the global `MAX(year)` over `admission_phases` once, then select every school's phases for that year (ordered by `phase_order`, grouped by school) with a `LEFT JOIN` to `balloting_details`, omitting schools with no rows for that year.
- [x] 1.2 Add `tests/test_db.py` coverage for `get_latest_admissions`: a school with data in the latest year (including a balloted phase), confirming a school with only older years (e.g. mirroring Damai/Kranji/Townsville) is omitted, and confirming a school with no phase data at all is omitted.
- [x] 1.3 Add Pydantic response models to `src/schoolsmap/api.py` (e.g. `BallotingDetail`, `AdmissionPhase`, `SchoolAdmissions`, and a wrapping response with `year` + list of schools) matching the `specs/schools-map-api` delta.
- [x] 1.4 Add `GET /api/schools/admissions` route in `src/schoolsmap/api.py`, using `get_latest_admissions` via a `Depends`-based provider consistent with the existing `get_schools` pattern.
- [x] 1.5 Add `tests/test_api.py` coverage for the new route: response includes a school with data and its balloting detail, and omits a school with no data for the latest year.

## 2. Frontend: extract App.tsx into modules (behavior-preserving)

- [x] 2.1 Create `frontend/src/types.ts` with `School`, `GeocodeCandidate` (moved from `App.tsx`) plus new `AdmissionPhase`, `BallotingDetail`, `SchoolAdmissions` types matching the new API response.
- [x] 2.2 Create `frontend/src/constants.ts` with the map/search constants currently at module scope in `App.tsx` (`SINGAPORE_CENTER`, `DEFAULT_ZOOM`, `SEARCH_MIN_QUERY_LENGTH`, `SEARCH_DEBOUNCE_MS`, `SEARCH_RADIUS_METERS`, `METERS_PER_DEGREE_LAT`).
- [x] 2.3 Create `frontend/src/leaflet-icons.ts` with the default-icon patch and `searchMarkerIcon`, moved as-is from `App.tsx`.
- [x] 2.4 Create `frontend/src/components/FitToSchools.tsx` and `frontend/src/components/PanToSearch.tsx`, moved as-is.
- [x] 2.5 Create `frontend/src/components/LocationSearch.tsx`, moved as-is (debounce/keyboard-nav logic unchanged).
- [x] 2.6 Update `App.tsx` to import from the new modules/components, with school rendering still inline at this checkpoint; verify `pnpm build` and the app's existing behavior (pins, popups, search) are unchanged before adding new behavior.

## 3. Frontend: batch-loaded admissions data in the popup

- [x] 3.1 Add `@tanstack/react-query` to `frontend/package.json`; wrap `App.tsx`'s composition in a `QueryClientProvider`.
- [x] 3.2 In `App.tsx`, add a `useQuery` that fetches `GET /api/schools/admissions` once on load, and build a lookup (e.g. `Map<schoolId, SchoolAdmissions>`) from the response.
- [x] 3.3 Create `frontend/src/components/AdmissionsTable.tsx`: pure render of a `SchoolAdmissions` payload (phase, vacancy, applied, taken, balloting category/applicants/vacancies where present).
- [x] 3.4 Create `frontend/src/components/SchoolMarker.tsx`: renders a school's `Marker`/`Popup` (name + address, as today) and a collapsed-by-default "Show admissions" toggle. On expand, looks up the school in the admissions map passed down from `App`: renders `AdmissionsTable` if found, a loading state if the batch query is still in flight, or "No admission data" if the batch has loaded and the school isn't present.
- [x] 3.5 Update `App.tsx`'s school-rendering loop to render `SchoolMarker` per school (passing the admissions lookup and query loading state) instead of the current inline `Marker`/`Popup`.
- [x] 3.6 Manually verify in the browser: the admissions batch request fires once on load (check network tab — not per popup), expanding "Show admissions" on a school with data shows the table, a school known to have no 2025 data (e.g. Damai, Kranji, or Townsville Primary) shows "No admission data", and expanding a popup immediately after page load (before the batch resolves) shows a loading state that then resolves correctly.

## 4. Spec sync

- [x] 4.1 Run the OpenSpec sync/archive flow to merge this change's delta specs (`schools-map-view`, `schools-map-api`) into `openspec/specs/` once implementation and verification above are complete.
