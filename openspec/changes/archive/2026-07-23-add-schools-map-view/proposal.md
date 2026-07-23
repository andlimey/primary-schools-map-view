## Why

This project has scraped and stored four years of P1 admission data for 182 schools, but there is no way to see those schools spatially. `schools_information.csv` already carries an `address` and a `postal_code` for every school — geocoding them and rendering them on a map turns a flat table into something a parent can actually explore by location. This also delivers on the project's own name, which currently has no map-view code at all.

## What Changes

- Add a batch geocoding step that derives latitude/longitude per school from `postal_code` (zero-padded to 6 digits, tried first via the OneMap Search API) falling back to `address` when the postal lookup fails, with disambiguation when a postal code resolves to multiple named entities (e.g. a co-located student care centre), and a manual-review record when neither field resolves.
- Add a FastAPI backend that reads the existing SQLite database live (no static export/rebuild step) and exposes an endpoint returning each school's id, slug, name, address, and coordinates.
- Add a React single-page app that renders all geocoded schools as pins on a Leaflet map using OpenStreetMap tiles, with a click/hover popup showing the school's name and address.
- Explicitly out of scope for this change: admission/balloting data on the map (rich popup with latest-year phases and ballot info) and the per-school detail page (2022–2025 history) linked from the popup — both are deferred follow-up work.

## Capabilities

### New Capabilities
- `school-geocoding`: deriving, validating, and persisting a latitude/longitude for each school from its postal code or address, including disambiguation and failure handling.
- `schools-map-api`: an HTTP API that serves geocoded school data live from the database for the map frontend to consume.
- `schools-map-view`: an interactive map UI that plots all geocoded schools and shows basic identifying info on interaction.

### Modified Capabilities
(none — `p1-admission-data` is unaffected; this change is purely additive)

## Impact

- **Database**: new columns/table on the existing SQLite schema to store coordinates, geocode provenance, and unresolved geocoding cases requiring manual review.
- **Backend**: new Python module(s) for the OneMap batch geocoding job, plus a new FastAPI application and its dependencies (distinct from the existing `p1scraper` scraping CLI, though it reads the same database).
- **Frontend**: a new React application (build tooling, Leaflet dependency) added to the repo; none exists today.
- **Credentials**: requires a free OneMap account; email/password must be supplied to the batch geocoding job via environment variables (not committed).
- **Existing scraper**: unaffected — `p1scraper`'s scrape/join/persist pipeline continues to run as-is.
