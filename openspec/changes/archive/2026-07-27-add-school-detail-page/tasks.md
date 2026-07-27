## 1. Backend: school detail endpoint

- [x] 1.1 Add `get_school_detail(conn, school_id)` to `src/p1data/db.py`: select `id, slug, name, address, url_address, zone_code, nature_code, mainlevel_code` for the given school id, returning `None` if no matching row.
- [x] 1.2 Add `tests/test_db.py` coverage for `get_school_detail`: an existing school returns the expected fields, a nonexistent id returns `None`.
- [x] 1.3 Add a `SchoolDetail` Pydantic model and `GET /api/schools/{id}` route in `src/schoolsmap/api.py`, returning a 404 when the school id doesn't exist.
- [x] 1.4 Add `tests/test_api.py` coverage for the new route: existing school returns its detail fields, nonexistent id returns 404.

## 2. Backend: admissions history endpoint

- [x] 2.1 Add `get_admissions_history(conn, school_id)` to `src/p1data/db.py`: select all `admission_phases` rows for the school across every year, `LEFT JOIN` to `balloting_details`, ordered by `year, phase_order`.
- [x] 2.2 Add `tests/test_db.py` coverage for `get_admissions_history`: a school with multiple years of data (including a balloted phase in at least one year) returns all years; a school with no phase data returns an empty result.
- [x] 2.3 Add response models (reusing/extending `AdmissionPhase`/`BallotingDetail` with a `year` field) and `GET /api/schools/{id}/admissions/history` route in `src/schoolsmap/api.py`, returning a 404 when the school id doesn't exist.
- [x] 2.4 Add `tests/test_api.py` coverage for the new route: a school with multi-year data returns all years' phases, a school with no admission data returns an empty history (not an error), a nonexistent school id returns 404.

## 3. Frontend: move existing map code into `map/` (behavior-preserving)

- [x] 3.1 Create `frontend/src/map/` and move `components/AdmissionsTable.tsx`, `components/FitToSchools.tsx`, `components/LocationSearch.tsx`, `components/PanToSearch.tsx`, `components/SchoolMarker.tsx` into it (drop the `components/` prefix; e.g. `map/SchoolMarker.tsx`), updating their relative imports.
- [x] 3.2 Move `types.ts` → `map/types.ts`, `constants.ts` → `map/constants.ts`, `leaflet-icons.ts` → `map/leaflet-icons.ts`.
- [x] 3.3 Update `App.tsx`'s imports to the new `map/` paths. No behavior or logic changes in this step.
- [x] 3.4 Verify `pnpm build` succeeds and the app's existing behavior (pins, popups, admissions expand, location search) is unchanged before proceeding.

## 4. Frontend: shared admission-phase types

- [x] 4.1 Create `frontend/src/shared/types.ts` containing `AdmissionPhase` and `BallotingDetail`, moved out of `map/types.ts`.
- [x] 4.2 Update `map/types.ts` and any files importing `AdmissionPhase`/`BallotingDetail` (e.g. `map/AdmissionsTable.tsx`, `map/SchoolMarker.tsx`) to import from `shared/types.ts` instead.

## 5. Frontend: routing setup

- [x] 5.1 Add `react-router-dom` to `frontend/package.json`.
- [x] 5.2 Wrap the existing map composition in `App.tsx` with a `HashRouter`, adding a `Routes`/`Route` for `/` (current map view, composed from `map/`) and `/schools/:slug` (new detail page).

## 6. Frontend: school-detail feature

- [x] 6.1 Create `frontend/src/school-detail/types.ts`: a school-detail type (name, address, url_address, zone_code, nature_code, mainlevel_code) and an admissions-history type composed as `AdmissionPhase & { year: number }` from `shared/types.ts`.
- [x] 6.2 Create `frontend/src/school-detail/api.ts`: fetch functions for `GET /api/schools/{id}` and `GET /api/schools/{id}/admissions/history`, and the react-query keys they're registered under (shared with the prefetch in task 7).
- [x] 6.3 Create `frontend/src/school-detail/MultiYearAdmissionsTable.tsx`: renders phases as rows and years as columns from an admissions-history payload, joining phases across years by `phase_code`, showing balloting category/applicants/vacancies inline per phase/year cell where present.
- [x] 6.4 Create `frontend/src/school-detail/SchoolDetailPage.tsx`: resolves `:slug` from the route params against the schools list (fetching it if not already loaded/cached), then fetches via the `api.ts` queries from 6.2, rendering name/address/url_address/zone_code/nature_code/mainlevel_code, the `MultiYearAdmissionsTable`, a "No admission data" state when history is empty, and a "school not found" state when the slug doesn't resolve.
- [x] 6.5 Wire `SchoolDetailPage` into the `/schools/:slug` route added in 5.2.

## 7. Frontend: popup link and prefetch

- [x] 7.1 In `map/SchoolMarker.tsx`, add a "More Details" link to `/#/schools/<slug>` in the popup.
- [x] 7.2 In `map/SchoolMarker.tsx`, trigger `queryClient.prefetchQuery` for both `school-detail/api.ts` queries (same keys used by `SchoolDetailPage`) when the marker's popup opens (click/hover), not when "More Details" is clicked.
- [x] 7.3 Manually verify in the browser: opening a popup fires the two prefetch requests (check network tab), clicking "More Details" afterward renders the detail page without new requests for that data, and navigating directly to a `/#/schools/:slug` URL (fresh load, e.g. via refresh) still renders correctly by fetching on its own.

## 8. Spec sync

- [x] 8.1 Run the OpenSpec sync/archive flow to merge this change's delta specs (`schools-map-view`, `schools-map-api`) and new spec (`school-detail-view`) into `openspec/specs/` once implementation and verification above are complete.
