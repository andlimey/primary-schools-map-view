## Why

School popups currently show only name, address, and (on expand) the single most-recent year of admission data. Users have no way to see a school's fuller identity (URL, zone, nature, level) or its ballot history across years — both explicitly deferred in the prior admissions-in-popup change. This change adds a dedicated per-school page reachable via a "More Details" link, showing that information plus every past year of admission/balloting data in one table.

## What Changes

- Add a "More Details" link to each school's map popup, navigating to a hash-routed detail page (`/#/schools/:slug`).
- Add client-side routing (`react-router-dom`, `HashRouter`) to the frontend — the first routing added to this app.
- Add a school detail page rendering: name, address, url_address, zone_code, nature_code, mainlevel_code, and a multi-year admissions table (phase × year grid, one column per year, including balloting detail per phase/year where it occurred).
- Add `GET /api/schools/{id}` — a school's detail fields (name, address, url_address, zone_code, nature_code, mainlevel_code).
- Add `GET /api/schools/{id}/admissions/history` — all years of that school's admission phase + balloting data (not just the most recent year).
- Add `db.get_school_detail(conn, school_id)` and `db.get_admissions_history(conn, school_id)` query functions.
- Prefetch both new endpoints (via react-query) when a user clicks a school's pin/marker (i.e. when its popup opens), ahead of any click on "More Details", so the detail page typically renders from cache.

## Capabilities

### New Capabilities
- `school-detail-view`: A per-school page, reached via a hash-routed URL, showing the school's identifying/administrative info and its full multi-year admission/balloting history.

### Modified Capabilities
- `schools-map-api`: Adds two new endpoints — single-school detail fields, and single-school multi-year admissions history — alongside the existing schools-list and latest-year-admissions endpoints.
- `schools-map-view`: Popup gains a "More Details" link to the new detail page; opening a popup now also triggers a prefetch of that school's detail and admissions-history data.

## Impact

- **Frontend structure**: `frontend/src/` moves from a horizontal layout (`components/`, `types.ts`, `constants.ts`) to feature ("vertical") folders — see `openspec/changes/add-school-detail-page/design.md` for the full rationale (https://tkdodo.eu/blog/the-vertical-codebase). Existing map/location-search code moves into `map/` (behavior-preserving); the new feature is built directly into `school-detail/`; `AdmissionPhase`/`BallotingDetail` move into `shared/types.ts`, used by both.
- **Frontend**: new dependency (`react-router-dom`); new `school-detail/SchoolDetailPage.tsx` route/page; `map/SchoolMarker.tsx` gains the "More Details" link and pin-click prefetch via react-query; `App.tsx` gains `HashRouter` wrapping.
- **Backend**: `src/schoolsmap/api.py` gains two routes and response models; `src/p1data/db.py` gains two query functions. No schema changes — `admission_phases`/`balloting_details`/`schools` already hold everything needed.
- **No changes** to `/api/schools`, `/api/schools/admissions`, or `/api/geocode` response shapes.
