## Context

The map (`frontend/src/App.tsx`, ~220 lines) currently renders one `Marker`/`Popup` per geocoded school with only name and address, backed by `GET /api/schools` (`src/schoolsmap/api.py`). Admission data already exists in SQLite (`admission_phases` ──< `balloting_details`, see `src/p1data/schema.sql`) for years 2022–2025, scraped from sgschooling.com and joined to the school registry, but nothing in the API or frontend surfaces it. This was a deliberate exclusion in the original map-view design ("Admission/balloting data anywhere on the map ... deferred to a follow-up change"), codified as a hard requirement in `openspec/specs/schools-map-view/spec.md` ("SHALL NOT show admission or balloting data" in the popup). This change is that follow-up, and must formally revise that requirement rather than quietly contradicting it.

`App.tsx` also already mixes several concerns — Leaflet icon setup, map constants, two small map-effect components (`FitToSchools`, `PanToSearch`), a self-contained `LocationSearch` widget, and the root composition/data-fetching — which is bundled into this change since the new popup logic needs its own component regardless of the refactor.

The dataset is small: 182 geocoded schools, each with roughly 4-6 admission phases for the most recent year, plus balloting detail rows for the subset of phases where balloting occurred (2 of 6 phases in a typical school). That puts the full most-recent-year payload at roughly 1,000 rows total — small enough to fetch in a single request rather than one request per school.

## Goals / Non-Goals

**Goals:**
- Show each school's most-recent-year admission phase results (and balloting detail, where applicable) in an expandable section of its map popup.
- Fetch that data efficiently given the dataset's small size — one request for all schools, not one per popup interaction.
- Split `App.tsx` into focused components/modules so the new popup logic has a natural home instead of growing the existing monolith further.

**Non-Goals:**
- Scraping or adding 2026 admission data — `config.YEARS` and the scraper are unrelated to this change; the map simply reflects whatever is the latest year already in the database.
- Historical/multi-year browsing (e.g. a year picker, trend charts) — only the most recent year is shown.
- A per-school detail page or route — still deferred, per the original design's other non-goal.
- Any change to the geocoding pipeline, school matching, or the existing `/api/schools` and `/api/geocode` endpoints' response shapes.

## Decisions

**"Most recent year" is a single global value (`MAX(year)` across all of `admission_phases`), not computed per school.** Alternative considered: fall back to each school's own latest available year, so the 3 schools whose data stops at 2022–2024 (Damai, Kranji, Townsville Primary — likely being phased out) would still show something. Rejected: it would require the popup to always disclose *which* year is shown (to avoid implying 2024 data is current), adding UI complexity for a 3-school edge case. Global-max is simpler and consistent: every school is evaluated against the same reference year, and the 3 exceptions naturally fall into the existing "no admission data" state.

**New bulk endpoint, `GET /api/schools/admissions`, returning every school's most-recent-year admission data in one response, fetched once when the map loads.** Alternatives considered: (a) a per-school endpoint (`GET /api/schools/{id}/admissions`) fetched lazily when each popup opens — this was the initial direction, but reconsidered given the actual data volume: at ~182 schools and ~1,000 total rows, fetching everything up front is cheap and avoids the complexity of per-marker fetch state, loading indicators per popup, and "already fetched" dedup logic; (b) embedding admissions directly in the existing `GET /api/schools` response — rejected to keep that endpoint's shape and purpose (geocoded pin list) unchanged, and so the admissions payload can be cached/refetched independently of the schools list.

**Response distinguishes "no data for the latest year" from "data present" by omission, not by null fields.** The endpoint returns a single resolved `year` plus a list of per-school entries; a school with no rows for that year (never-matched schools, or the 3 schools noted above) is simply absent from the list, mirroring the existing precedent in `schools-map-api` where ungeocoded schools are omitted from `/api/schools` rather than included with null coordinates. The frontend treats "school id not present in the admissions map" as "no admission data."

**Frontend still adopts `@tanstack/react-query`** for the bulk fetch's loading/error/refetch handling, consistent with the project's decision to standardize on it going forward, even though the per-key caching that motivated its original consideration (many independent per-school fetches) is no longer the primary driver now that this is a single request. The existing `/api/schools` and `/api/geocode` fetches are left as plain `fetch`/`useEffect` for this change, to keep the blast radius limited to what's actually being added.

**Popup gets a collapsed-by-default expandable section ("▸ Show admissions"), not a separate panel or route.** Consistent with the existing interaction model (all school info lives in the popup) and avoids new routing/layout work. Expanding it looks up the school's entry in the already-loaded admissions data (no network call at expand time) and renders a full table (phase, vacancy, applied, taken, and balloting category/applicants/vacancies where present) rather than a condensed summary, since the phase-level detail is the actual content users are after.

**`App.tsx` split**, driven by existing seams already visible in the file plus the new popup component:
- `types.ts` — `School`, `GeocodeCandidate`, and new `AdmissionPhase`/`BallotingDetail`/`SchoolAdmissions` types.
- `constants.ts` — map/search constants currently at module scope in `App.tsx`.
- `leaflet-icons.ts` — the default-icon patch and `searchMarkerIcon`, currently module-level side effects in `App.tsx`.
- `components/FitToSchools.tsx`, `components/PanToSearch.tsx` — unchanged logic, moved as-is.
- `components/LocationSearch.tsx` — unchanged logic, moved as-is.
- `components/SchoolMarker.tsx` — new; owns a single school's `Marker`/`Popup` and the expand/collapse toggle, looking up that school's admissions from the batch data already loaded at the `App` level (passed down or read via the shared `useQuery` cache).
- `components/AdmissionsTable.tsx` — new; pure rendering of a resolved `SchoolAdmissions` payload.
- `App.tsx` — thinned to `QueryClientProvider` + `MapContainer` composition, the existing `/api/schools` list fetch, and the new bulk admissions `useQuery`.

Backend query support: `src/p1data/db.py` gains `get_latest_admissions(conn)`, resolving the global max year once, then selecting all schools' phases for it with a `LEFT JOIN` to `balloting_details`, grouped by school. `src/schoolsmap/api.py` gains matching Pydantic response models and the route, following the existing `get_geocoded_schools`/`School` pattern already in that file.

## Risks / Trade-offs

- **[Trade-off]** Fetching all schools' admissions data up front means users who only ever look at 1-2 pins still download the full ~1,000-row payload → accepted given the dataset's small absolute size (well under what would need pagination or a per-school approach); revisit if the scraped dataset grows by an order of magnitude (many more years or a national schools list beyond primary).
- **[Trade-off]** Global-max-year silently hides real (if stale) data for 3 schools rather than showing their last-known figures → accepted per the "Modified Capabilities" decision above; revisit with a per-school fallback if the phased-out-school count grows.
- **[Risk]** If a user opens a popup before the admissions batch fetch has resolved (e.g. on a slow connection, immediately after page load), the expandable section has nothing to show yet → **Mitigation**: the section shows a loading state (driven by the shared query's `isLoading`) until the batch resolves, then re-renders with the looked-up data.
- **[Risk]** Adding `@tanstack/react-query` is a new frontend dependency and a new pattern (`QueryClientProvider` wrapping the app) for a codebase that has so far used plain `fetch`/`useEffect` throughout → **Mitigation**: scoped to the one new fetch path introduced here; the existing `/api/schools` and `/api/geocode` fetches are left as-is rather than migrated, to keep this change's blast radius limited to what it's actually adding.

## Migration Plan

1. Add `get_latest_admissions` to `db.py` and the corresponding models/route to `api.py`; no schema changes needed since `admission_phases`/`balloting_details` already exist.
2. Extract `types.ts`, `constants.ts`, `leaflet-icons.ts`, and move `FitToSchools`/`PanToSearch`/`LocationSearch` into `components/` unchanged, verifying the app still builds and behaves identically at this checkpoint before adding new behavior.
3. Add `@tanstack/react-query`, build `SchoolMarker` and `AdmissionsTable`, wire `App.tsx` to fetch the admissions batch once and wire the school-rendering loop to use `SchoolMarker` in place of the current inline `Marker`/`Popup`.
4. Update `openspec/specs/schools-map-view/spec.md` and `openspec/specs/schools-map-api/spec.md` per this change's delta specs.

Rollback: purely additive on the backend (new endpoint, new query function) and a frontend-only behavior change gated to the popup — reverting is a straightforward revert of the frontend commit(s) and route removal, with no data migration to undo.

## Open Questions

- Whether the 3 schools with stale (pre-2025) data are actually closing/merging, and whether that should someday be surfaced explicitly (e.g. "last admitted in 2024") — out of scope here, noted in case it recurs as more schools age out of the global-max year.
- Whether `/api/schools/admissions` should eventually accept a `year` query param for historical browsing — deliberately not built now (Non-Goal), but the response shape (`{ year, schools: [...] }`) should stay compatible with that extension if it comes up later.
