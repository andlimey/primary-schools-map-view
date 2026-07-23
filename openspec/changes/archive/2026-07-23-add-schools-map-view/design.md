## Context

The project currently consists of a Python scraper (`p1scraper`) that joins `schools_information.csv` (which has `address` and `postal_code` per school) against scraped P1 admission data, storing everything in a local SQLite database. There is no frontend, no coordinates anywhere in the schema, and no map dependency. Investigation during exploration surfaced a concrete data-quality issue: at least 3 of the 182 schools have a `postal_code` that lost its leading zero in the source CSV (e.g. `88256` instead of `088256`), which would silently break naive postal-code geocoding.

Live testing against the OneMap Search API (Singapore Land Authority's authoritative address/geocoding service) during exploration confirmed:
- Zero-padding those postal codes to 6 digits resolves them correctly.
- Unauthenticated requests currently still return valid results (HTTP 200) but include an `error` field warning that a token is required — an explicit signal the API is moving toward requiring authentication, so this design treats a token as required rather than relying on the unauthenticated path.
- A single postal code can resolve to multiple named entities at the same building (e.g. a school and a co-located student care centre both registered at the same postal code) — naively taking the first result risks picking the wrong entity.
- The token endpoint (`POST /api/auth/post/getToken` with `email`/`password`) returns an `access_token` valid ~3 days.

## Goals / Non-Goals

**Goals:**
- Derive an accurate latitude/longitude for every school that can be resolved, preferring the postal code and falling back to the address.
- Serve this data live (no static export/rebuild step) so the map reflects the database as soon as the scraper/geocoder update it.
- Render all geocoded schools on an interactive, publicly reachable map with minimal identifying info per school.

**Non-Goals:**
- Admission/balloting data anywhere on the map (rich popup, filtering by demand, etc.) — deferred to a follow-up change.
- A per-school detail page and the popup link to it — deferred to a follow-up change.
- Real-time/live updates via websockets — data only changes when the scraper or geocoding batch job is re-run, which is infrequent (admission data updates ~once/year).
- User accounts, authentication, or any write path for end users — this is a read-only public map.
- A tool/process for resolving the manual-review queue — out of scope; the queue is populated but not yet acted upon by tooling.

## Decisions

**Zero-pad `postal_code` to 6 digits before any lookup.** The raw CSV already has leading zeros stripped for postal codes starting with `0` (confirmed for 3 schools; likely a spreadsheet-tool artifact upstream). Padding is cheap and fixes it outright; trusting the raw value was rejected since it's confirmed corrupt for real schools.

**Geocode via OneMap's Search API, not Nominatim or Google Maps.** OneMap is built directly on SLA's authoritative Singapore building/address register, so a postal-code query resolves to an exact building — stronger than OSM's community-maintained Nominatim data for this specific use case. Google Maps Geocoding was rejected due to unnecessary cost/key-management for an entirely-Singapore dataset that OneMap already serves well for free.

**Treat OneMap authentication as required.** Live testing showed unauthenticated search calls still return valid data today, but the response body itself warns that a token is required going forward. Rather than build against a path that could break without notice, the batch geocoding job authenticates via `POST /api/auth/post/getToken` (email/password from environment variables) and sends the resulting token on every search request. Since geocoding is a batch job, not a per-request runtime dependency, the ~3-day token expiry only matters at batch-run time — no token-refresh scheduling is needed in the running API service.

**Postal code first, address only on failure — no cross-check.** Considered geocoding both fields for every school and comparing results for agreement, which would double as a broader data-quality check. Rejected in favor of the simpler fallback-only approach: postal code is trustworthy once zero-padded, and the added complexity/API calls of a full cross-check weren't judged worth it for v1.

**Disambiguate multi-result postal lookups by matching `BUILDING` against the school's own name**, reusing the name-normalization approach already established in `normalize.py` for the scraper's site-matching step, rather than defaulting to the first result. Confirmed necessary — this exact ambiguity was observed for 3 schools during testing (each sharing a postal code with a co-located childcare/student-care centre).

**Store coordinates as new columns on the existing `schools` table** (`latitude`, `longitude`, `geocode_source`, `geocode_confidence`), mirroring the existing `match_method`/`match_confidence` columns already used for the site-name-matching step. A separate table was considered, for cleaner separation and independent re-runnability, but rejected to keep the schema shape consistent with existing precedent; revisit if geocoding needs its own audit trail later.

**Unresolved schools go to a manual-review record, never a guess** — mirrors the existing `unmatched_schools` table pattern already used when a school's name can't be automatically matched to the scraped site.

**FastAPI backend, reading the SQLite DB live; no static export step.** The "shared publicly, always current" requirement rules out a build-and-redeploy-on-every-update workflow. FastAPI also keeps the whole project on one language (Python) rather than introducing Rails/Express for no added benefit at this scale. The backend also serves the built React app as static files, so the deployed site is a single process with no CORS configuration required.

**React frontend with Leaflet + plain OpenStreetMap tiles**, chosen over OneMap's own tile layer specifically to avoid adding a second token-refresh dependency (tiles) on top of the one already required for geocoding. OSM tiles need no API key or signup and are adequate at this project's traffic scale.

**Map interaction scope for v1 is deliberately minimal**: click/hover shows only school name and address. No admission data, no outbound link — both are explicitly deferred, per the proposal.

## Risks / Trade-offs

- **[Risk]** OneMap could change its API shape or fully deprecate the endpoints used here → **Mitigation**: already building against token-based auth rather than the unauthenticated path observed during testing.
- **[Risk]** OneMap email/password credentials, if leaked, could let others exhaust the account's token quota → **Mitigation**: credentials supplied only via environment variables, never committed; document rotation in the batch job's setup notes.
- **[Risk]** Some schools may fail to geocode via both postal code and address for reasons beyond the known leading-zero cases → **Mitigation**: such schools land in the manual-review record and are simply omitted from the map (no pin) rather than blocking the rest of the dataset.
- **[Risk]** OSM's tile usage policy discourages heavy production traffic without self-hosting → **Mitigation**: acceptable at this project's expected scale; revisit self-hosted tiles or a paid provider if traffic grows materially.
- **[Trade-off]** Skipping the postal/address cross-check means a plausible-but-wrong postal geocode wouldn't be caught by comparing against address → **Mitigation**: the Singapore bounding-box sanity check and manual-review flagging catch the failure modes found so far; a cross-check can be added later if further corruption surfaces in production.

## Migration Plan

1. Extend the SQLite schema: add `latitude`, `longitude`, `geocode_source`, `geocode_confidence` columns to `schools`, and a new table for geocoding manual-review records (analogous to `unmatched_schools`).
2. Run the geocoding batch job once over all 182 existing schools; spot-check a sample of resolved coordinates against known landmarks.
3. Stand up the FastAPI backend against the updated schema.
4. Build the React map frontend against the FastAPI schools endpoint.
5. Deploy backend + frontend as a single process.

Rollback: the new columns/table are additive and nullable, so they don't affect the existing scraper pipeline if something needs to be reverted. The FastAPI/React services are new and can simply be left undeployed if an issue is found before going live.

## Open Questions

- Hosting target for the deployed FastAPI+React service is not yet decided — needed before actual deployment, but doesn't block this change's implementation.
- Whether OneMap's free-tier token has a request-rate ceiling wasn't surfaced by ad hoc testing (8 rapid unauthenticated calls all succeeded); the batch job should still throttle politely rather than assume no limit exists.
- No process or tooling is defined yet for actually resolving schools that land in the manual-review queue — likely fine to handle manually given the expected low volume, but worth revisiting if it grows.
