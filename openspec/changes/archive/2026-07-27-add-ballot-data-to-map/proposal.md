## Why

The map currently shows only a school's name and address on interaction — admission/balloting outcomes were deliberately deferred when the map view first shipped ("Admission/balloting data anywhere on the map ... deferred to a follow-up change," per the original design doc). That data (P1 admission phases and balloting details) has been scraped and persisted since, but users have no way to see it without leaving the map. Surfacing the most recent year's admission results per school is the natural next step, and doing it now is also the right moment to split `frontend/src/App.tsx` (~220 lines and growing) into individual components, since the new popup logic needs its own component regardless.

## What Changes

- Add a bulk admissions endpoint, `GET /api/schools/admissions`, returning the most recent year (global `MAX(year)` across all scraped data) of phase records for every school that has data for that year, each phase optionally carrying balloting detail (category, applicants, vacancies) for phases that balloted. At ~182 schools with a handful of phases each, this is small enough to fetch in one request rather than per-school.
- Add an expandable "Show admissions" section to each school's map popup, showing a full table of that school's most-recent-year phases (vacancy/applied/taken, plus balloting figures where applicable).
- The admissions data is fetched once, for all schools, when the map loads — via TanStack Query (`@tanstack/react-query`, new dependency) for its loading/error/refetch handling — and looked up per school when a popup's admissions section is expanded, rather than triggering a fetch per popup interaction.
- Schools with no phase data for the most-recent global year (whether never matched to the scraped source, or — for 3 known schools — only having older years) show "No admission data" rather than stale or missing figures. **BREAKING**: reverses the existing `schools-map-view` requirement that popups SHALL NOT show admission/balloting data.
- Refactor `frontend/src/App.tsx` into individual components (types, constants, icon setup, `FitToSchools`, `PanToSearch`, `LocationSearch`, a new `SchoolMarker` owning the popup + admissions lookup, a new `AdmissionsTable`), with `App.tsx` thinned to composition. Pure restructuring — no behavior change beyond what's described above.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `schools-map-view`: popups now show a most-recent-year admissions table in an expandable section, replacing the prior "SHALL NOT show admission or balloting data" requirement; schools without data for that year show an explicit "No admission data" state.
- `schools-map-api`: adds a new bulk endpoint serving every school's most-recent-year admission phase and balloting data, live from the database.

## Impact

- Backend: `src/p1data/db.py` (new query for latest-year phases + balloting across all schools, joined), `src/schoolsmap/api.py` (new Pydantic models and route).
- Frontend: `frontend/src/App.tsx` split into `types.ts`, `constants.ts`, `leaflet-icons.ts`, `components/FitToSchools.tsx`, `components/PanToSearch.tsx`, `components/LocationSearch.tsx`, `components/SchoolMarker.tsx`, `components/AdmissionsTable.tsx`; new dependency `@tanstack/react-query`.
- No schema changes — `admission_phases` and `balloting_details` already hold the needed data.
- Out of scope: scraping 2026 admission data (separate gap, unrelated to this change), historical/multi-year browsing in the UI, and a per-school detail page (still deferred per the original design's other non-goal).
