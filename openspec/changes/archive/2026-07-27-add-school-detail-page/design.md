## Context

The map (`frontend/src/App.tsx` → `SchoolMarker.tsx`) renders one popup per school with name, address, and an expandable most-recent-year admissions table, backed by `GET /api/schools` and `GET /api/schools/admissions` (`src/schoolsmap/api.py`). Both a per-school detail page and multi-year/historical browsing were explicit non-goals of that prior change (`archive/2026-07-27-add-ballot-data-to-map/design.md`): *"A per-school detail page or route — still deferred"* and *"Historical/multi-year browsing ... deferred"*. This change delivers both together.

The `schools` table (`src/p1data/schema.sql`) already has `url_address`, `zone_code`, `nature_code`, and `mainlevel_code` columns, populated from the source CSV but never exposed via the API. `admission_phases`/`balloting_details` already hold every scraped year (2022–2025 currently) keyed by `school_id, year`; only `db.get_latest_admissions` (global-max-year, all schools) exists today — there is no per-school, all-years query.

`School.slug` (e.g. `"admiralty"`) is already returned by `/api/schools` and typed in the frontend but currently unused in the UI.

The frontend has no routing today — `App.tsx` renders a single `MapContainer` directly. In production, `schoolsmap/api.py` serves the built frontend via `StaticFiles(directory="frontend/dist", html=True)` mounted at `/`; Starlette's `StaticFiles(html=True)` only serves `index.html` for directory-shaped requests (or a `404.html`, which doesn't exist here) — it does not fall back to `index.html` for arbitrary unmatched paths. A path-based client route (e.g. `/schools/admiralty`) would 404 on direct load/refresh/share unless the backend added an explicit catch-all fallback route.

`frontend/src/` is currently organized horizontally (by technical type): a single `components/` folder, a single `types.ts`, a single `constants.ts`, and `leaflet-icons.ts` at the top level — all of it, today, in service of the one existing feature (the map). This change adds a second, distinct feature (the school detail page), which is a natural point to switch to organizing by feature instead, per the "vertical codebase" approach (https://tkdodo.eu/blog/the-vertical-codebase): group each feature's components, types, constants, and API calls together, and reserve a shared location only for what's genuinely used by more than one feature.

## Goals / Non-Goals

**Goals:**
- Add a "More Details" link in each school's popup that navigates to a dedicated per-school page.
- That page shows: name, address, url_address, zone_code, nature_code, mainlevel_code, and every year of admission phase + balloting data in one table (phases as rows, years as columns).
- Avoid any backend routing/fallback changes by using hash-based client-side routing.
- Prefetch a school's detail + admissions-history data as soon as its popup opens (pin click), so the detail page can often render from cache.

**Non-Goals:**
- The fuller school profile (phone numbers, principal/VP names, MRT/bus description, SAP/Autonomous/GEP/IP indicators, mother-tongue codes) — deferred; only the six fields above are shown.
- Trend charts or any visualization of ballot data beyond a plain table.
- Path-based routing or any change to how the backend serves static assets.
- Combining school-detail and admissions-history into a single endpoint/request.
- Changes to `/api/schools`, `/api/schools/admissions`, or `/api/geocode`.

## Decisions

**Hash-based routing (`HashRouter` from `react-router-dom`), URL shape `/#/schools/:slug`.** The `#` fragment is stripped by the browser before the HTTP request is sent, so every request the server sees is still `GET /` — identical to today's behavior, requiring zero backend routing changes. Alternative considered: path-based routing (`/schools/:slug`) with a FastAPI catch-all fallback serving `index.html` for non-API paths — rejected for this change to keep the backend untouched entirely; the cosmetic cost (a `#` in the URL) was judged acceptable. `:slug` (not `:id`) is used since `School.slug` already exists, is human-readable, and is already returned by `/api/schools`.

**Frontend reorganized into feature ("vertical") folders: `map/`, `school-detail/`, and `shared/`, replacing the current horizontal `components/`/`types.ts`/`constants.ts` split.** All existing map/location-search code (`components/*`, `types.ts`, `constants.ts`, `leaflet-icons.ts`) moves into `frontend/src/map/` as a behavior-preserving move (no logic changes) — chosen over leaving it flat, since leaving one vertical feature (`school-detail/`) next to a horizontal leftover would mean the codebase follows two conventions at once with no path back to one, and the move itself is low-risk (same pattern as the prior change's `App.tsx` extraction, verified by an unchanged build/behavior checkpoint). The new `school-detail/` feature is built vertical from the start: `SchoolDetailPage.tsx`, `MultiYearAdmissionsTable.tsx`, its own `api.ts` and `types.ts`. `App.tsx`/`main.tsx` stay at `src/` root as the composition/routing layer, importing from both feature folders — this is the one place cross-feature coupling is expected and fine.

`AdmissionPhase` and `BallotingDetail` (single-year, used by `map/`'s existing popup table) and the new multi-year history shape (the same per-phase/balloting fields plus a `year`) are structurally the same core shape. Rather than `school-detail/` importing types directly from `map/` (coupling the two features to each other) or duplicating the shape (two definitions to keep in sync), `AdmissionPhase` and `BallotingDetail` move to `frontend/src/shared/types.ts`; `school-detail/types.ts` composes its history type as `AdmissionPhase & { year: number }` from there. `map/` re-exports or imports the same shared types rather than keeping its own copy. Nothing else is shared between the two features today (`leaflet-icons.ts`, the map constants, and `LocationSearch` are all map-only — `school-detail/` renders no map), so `shared/` stays limited to just these two types rather than becoming a new dumping ground.

**Two separate endpoints, matching the proposal's explicit choice:**
- `GET /api/schools/{id}` — detail fields only (name, address, url_address, zone_code, nature_code, mainlevel_code).
- `GET /api/schools/{id}/admissions/history` — all years of phase + balloting data for that school.

Kept as two requests (not merged, not a combined `?include=` param) per explicit direction — simpler backend handlers, and it lets react-query cache/prefetch/invalidate each independently. Both are looked up by numeric `id` (not `slug`) to match the existing `/api/schools/{id}`-style convention implied by the schools table's primary key; the frontend route itself still uses `:slug` for the URL, resolving `slug → id` via the already-loaded schools list (already fetched by `App.tsx` for the map) before firing these requests.

**Multi-year table shape: phases as rows, years as columns.** Chosen (over one stacked table per year) because it's a single component reusing tabular data the same way `AdmissionsTable` already does, and lets a user compare a phase's trend across years in one glance without scrolling between tables. `phase_code` (not `phase_label`) is the join key across years, since it's documented in `schema.sql` as "normalized, cross-year comparable" while `phase_label` is raw per-year text; the table row label uses the most recent year's `phase_label` for that `phase_code`. Balloting detail (category/applicants/vacancies), where present for a phase/year, renders inline in that cell, consistent with how the existing single-year `AdmissionsTable` shows it.

**Prefetch trigger: pin/marker click (i.e., popup open), not the "More Details" link click.** Implemented as a `queryClient.prefetchQuery` call in `SchoolMarker`'s existing click/open handling (Leaflet's `Marker` already fires a popup-open interaction on click/hover), for both the detail and history queries, keyed by school id. This is a deliberate widening of when the fetch fires — most popups a user opens are ones they're actively looking at, so the cost of a slightly wasted fetch (popup opened, "More Details" never clicked) is accepted in exchange for the detail page usually rendering instantly.

**Detail page still uses `@tanstack/react-query`** (`useQuery`, same keys as the prefetch) for its own fetch-on-mount, so navigating directly to a `/#/schools/:slug` URL (no prior popup interaction) still works standalone, and a completed prefetch is picked up from cache with no extra request.

## Risks / Trade-offs

- **[Trade-off]** Hash routing produces `/#/schools/admiralty` instead of a cleaner `/schools/admiralty` → accepted; revisit if the backend later grows a reason to inspect the path server-side (e.g. SSR, server-rendered previews/OG tags), at which point path-based routing plus the fallback route becomes worth the small backend change.
- **[Trade-off]** Prefetching on every popup open fetches data for schools the user never drills into → accepted given the dataset's small size (same order of magnitude as the existing bulk admissions fetch, but per-school and only for schools actually clicked, not all 182 up front).
- **[Risk]** Resolving `slug → id` client-side (from the already-loaded `/api/schools` list) means a stale or missing schools list would make a valid `/#/schools/:slug` URL unresolvable → **Mitigation**: `App.tsx` already fetches the full schools list before rendering any markers; the detail route reads from the same loaded list (or refetches it if landed on directly with an empty cache), and shows a "school not found" state if the slug genuinely doesn't match any school.
- **[Risk]** `phase_code` joining phases across years assumes it's stable year-to-year for the same phase — if a phase's code changed between scrape years, that phase would appear as two separate rows instead of one → **Mitigation**: none needed proactively; `phase_code` is already documented as the cross-year-comparable key and is relied on nowhere else being inconsistent; if it surfaces, it's a `p1data` parsing/normalization fix, not a design change here.
- **[Risk]** Moving all existing map code into `map/` touches every file the current map view depends on, even though none of their logic changes → **Mitigation**: done as its own migration step (step 3) with an explicit build/behavior checkpoint before any new feature code is added, mirroring how the prior change's `App.tsx` extraction was sequenced and verified.

## Migration Plan

1. Add `db.get_school_detail` and `db.get_admissions_history` to `src/p1data/db.py`; no schema changes.
2. Add matching Pydantic models and the two routes to `src/schoolsmap/api.py`.
3. Move existing map code into `frontend/src/map/` (behavior-preserving): `components/*` → `map/*`, `types.ts` → `map/types.ts`, `constants.ts` → `map/constants.ts`, `leaflet-icons.ts` → `map/leaflet-icons.ts`; update `App.tsx`'s imports; verify `pnpm build` and existing behavior (pins, popups, search) are unchanged before adding new behavior.
4. Extract `AdmissionPhase`/`BallotingDetail` out of `map/types.ts` into `frontend/src/shared/types.ts`; update `map/`'s imports to the shared location.
5. Add `react-router-dom` to `frontend/package.json`; wrap `App.tsx`'s existing tree in `HashRouter`, add a `Routes`/`Route` for `/` (existing map view, now composed from `map/`) and `/schools/:slug`.
6. Build `frontend/src/school-detail/SchoolDetailPage.tsx` (fetches by resolved id, renders the six fields + multi-year table) and `frontend/src/school-detail/MultiYearAdmissionsTable.tsx`, plus its `api.ts`/`types.ts`.
7. Add the "More Details" link to `map/SchoolMarker.tsx`'s popup, and wire pin-click prefetch via `queryClient.prefetchQuery` for both new endpoints.
8. Update `openspec/specs/schools-map-api/spec.md` and `openspec/specs/schools-map-view/spec.md` per this change's delta specs; add `openspec/specs/school-detail-view/spec.md`.

Rollback: purely additive on the backend (two new routes/queries) and additive on the frontend (new route + link); reverting is a straightforward revert of the frontend/backend commits, with no data migration to undo.

## Open Questions

- None outstanding — all forks from discovery (info fields, table shape, routing approach, request split, prefetch trigger) were resolved before this proposal was written.
