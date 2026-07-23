## 1. Schema migration

- [x] 1.1 Add `latitude`, `longitude`, `geocode_source`, `geocode_confidence` columns to the `schools` table in `src/p1scraper/schema.sql`
- [x] 1.2 Add a `geocoding_review` table (id, school_id, reason, candidate_results JSON, detected_at) mirroring the existing `unmatched_schools` pattern
- [x] 1.3 Write a migration path for the already-populated `data/output.sqlite3` (ALTER TABLE ADD COLUMN, since rows already exist)

## 2. Geocoding batch job

- [x] 2.1 Add a OneMap API client module: token acquisition (`POST /api/auth/post/getToken` with email/password from env vars), token caching for the run, and an authenticated search call
- [x] 2.2 Implement postal code zero-padding to 6 digits
- [x] 2.3 Implement disk caching of raw OneMap responses under `cache/geocode/`, keyed by normalized query value
- [x] 2.4 Implement the postal-code-first, address-fallback lookup flow per school
- [x] 2.5 Implement disambiguation: when a postal search returns multiple results, match `BUILDING` against the school's normalized name (reuse `normalize_name`/candidate logic from `src/p1scraper/normalize.py`)
- [x] 2.6 Implement Singapore bounding-box validation on any resolved coordinate before persisting
- [x] 2.7 Implement manual-review recording for schools that fail both lookups, fail disambiguation, or fail bounds validation
- [x] 2.8 Implement idempotent persistence: skip re-querying schools whose postal_code/address are unchanged and already successfully geocoded
- [x] 2.9 Add a CLI entry point for running the geocoding batch job (analogous to `scrape-p1`)
- [x] 2.10 Run the batch job once against all 182 schools in `data/output.sqlite3`; manually spot-check a sample of resolved coordinates against known landmarks
- [x] 2.11 Review the resulting `geocoding_review` records, if any, for schools that need manual follow-up

## 3. Backend API

- [x] 3.1 Add a FastAPI application (new module, e.g. `src/schoolsmap/api.py`) with its own dependencies in `pyproject.toml`
- [x] 3.2 Implement `GET /api/schools` returning id, slug, name, address, latitude, longitude for every school with persisted coordinates, reading live from SQLite
- [x] 3.3 Exclude ungeocoded schools (no persisted coordinates) from the response
- [x] 3.4 Mount the built frontend's static assets so the API and frontend are served from one origin
- [x] 3.5 Add a basic test verifying the endpoint's shape and the exclusion of ungeocoded schools

## 4. Frontend map

- [x] 4.1 Scaffold a React application (e.g. via Vite) in a new `frontend/` directory
- [x] 4.2 Add Leaflet (and React-Leaflet) as a dependency
- [x] 4.3 Implement the map view: fetch `GET /api/schools` on load, render one pin per school
- [x] 4.4 Configure the base tile layer to use OpenStreetMap tiles
- [x] 4.5 Set the default map center/zoom to fit the geographic extent of the returned schools
- [x] 4.6 Implement the click/hover popup showing only school name and address
- [x] 4.7 Add a production build step producing static assets consumable by the FastAPI static mount

## 5. Verification

- [x] 5.1 Run the full pipeline end-to-end locally: scraper → geocoding batch job → FastAPI → React build, and confirm pins render correctly for a sample of schools across different zones
- [x] 5.2 Confirm a school in the manual-review record does not appear on the map (no pin, no crash)
- [x] 5.3 Confirm re-running the geocoding batch job a second time makes no changes to already-resolved schools (idempotency)
