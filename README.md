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

Run these in order to populate `data/schools.sqlite3`:

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

`data/schools.sqlite3` is committed to the repo (it's small and changes
infrequently — roughly once a year, when a new P1 admission exercise is
scraped). After rerunning the pipeline, review the diff and commit the
refreshed file:

```bash
git add data/schools.sqlite3
git commit -m "Refresh school/admission data"
```

This is also how deployed data gets updated — see
[Deploying](#deploying).

## Running the app locally

You need `data/schools.sqlite3` populated (see [Pipeline](#pipeline)) before
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

## Deploying

The app is a single Docker image (multi-stage build: the frontend is built
in a Node stage, then copied into a Python runtime stage alongside the
committed `data/schools.sqlite3`) deployed to a single always-on Fly.io
machine.

```bash
# one-time setup, from your machine
fly auth login
fly apps create <your-app-name>   # match the `app` name in fly.toml
fly secrets set ONEMAP_EMAIL=... ONEMAP_PASSWORD=...
fly deploy
```

After that, `.github/workflows/deploy.yml` handles ongoing deploys:
`pytest` and the frontend build/lint run as a merge gate on every push and
pull request, and a merge to `main` that passes the gate triggers
`flyctl deploy` automatically, authenticated with the `FLY_API_TOKEN`
repository secret (generate one with `fly tokens create deploy` and add it
under the repo's Settings → Secrets and variables → Actions).

Because the database is baked into the image rather than mounted from
persistent storage, **a deployed instance only picks up new data on its next
deploy** — rerunning the pipeline against a live instance does nothing.
Refresh data by following the [Pipeline](#pipeline) steps locally, commit
the result, and push/merge to `main` as usual.

## Tests

```bash
pytest
```

## Project layout

```
src/p1data/      scraping, parsing, geocoding, and DB logic
src/schoolsmap/  FastAPI app serving /api/schools + the frontend build
frontend/        React + Leaflet map UI
data/            SQLite DB (committed) + school registry CSVs
cache/           cached scrape/geocode responses (gitignored)
logs/            unmatched-school reports from scraper runs (gitignored)
openspec/        specs describing this project's behavior
```

See `openspec/specs/` for the detailed behavioral specifications behind the
scraper, geocoder, API, and map view.
