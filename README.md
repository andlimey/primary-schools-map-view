# Primary Schools Map View

Scrapes Singapore Primary 1 (P1) admission balloting data, geocodes each
school's address, and serves the results as an interactive map.

The project has three parts:

- **`p1data`** — scrapes P1 admission phase/balloting data from
  [sgschooling.com](https://sgschooling.com) and geocodes school addresses via
  [OneMap](https://www.onemap.gov.sg/), storing everything in a local SQLite
  database.
- **`schoolsmap`** — a FastAPI app that serves the geocoded schools as JSON
  and hosts the built frontend from the same origin.
- **`frontend`** — a React + Leaflet map that plots each school as a pin
  using OpenStreetMap tiles (no API key required).

## Prerequisites

- Python >= 3.11
- Node.js + [pnpm](https://pnpm.io/) (for the frontend)
- A free [OneMap](https://www.onemap.gov.sg/apidocs/register) account
  (only needed for geocoding)

## Setup

Install the Python package (uses [uv](https://docs.astral.sh/uv/), or `pip`
works too):

```bash
uv sync
# or: pip install -e ".[dev]"
```

Copy the environment template and fill in your OneMap credentials:

```bash
cp .env.example .env
```

## Pipeline

Run these in order to populate `data/output.sqlite3`:

```bash
# 1. Scrape P1 admission data from sgschooling.com for the configured years
scrape-p1

# 2. Geocode each school's postal code/address via OneMap
geocode-schools
```

Both commands are safe to re-run — the scraper re-fetches (or reads from
cache with `--use-cache`) and upserts, and the geocoder only processes
schools that don't already have coordinates. Unmatched schools are written to
`logs/`.

## Running the app locally

You need `data/output.sqlite3` populated (see [Pipeline](#pipeline)) before
either mode below will show any schools.

### Production-style (single origin)

Build the frontend once, then start the API, which also serves the built
frontend at `/`:

```bash
cd frontend && pnpm install && pnpm build && cd ..
schools-map-api
```

Open `http://localhost:8000` — the map and API are served from the same
origin.

### Development (hot reload)

Run the API and the Vite dev server in two terminals:

```bash
# terminal 1 — API on :8000
schools-map-api

# terminal 2 — frontend on :5173 with HMR
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to
`http://localhost:8000` (see `frontend/vite.config.ts`), so the API must be
running first. See [frontend/README.md](frontend/README.md) for more on the
frontend tooling.

## Tests

```bash
pytest
```

## Project layout

```
src/p1data/      scraping, parsing, geocoding, and DB logic
src/schoolsmap/  FastAPI app serving /api/schools + the frontend build
frontend/        React + Leaflet map UI
data/            SQLite DB + school registry CSVs (DB is gitignored)
cache/           cached scrape/geocode responses (gitignored)
logs/            unmatched-school reports from scraper runs (gitignored)
openspec/        specs describing this project's behavior
```

See `openspec/specs/` for the detailed behavioral specifications behind the
scraper, geocoder, API, and map view.
