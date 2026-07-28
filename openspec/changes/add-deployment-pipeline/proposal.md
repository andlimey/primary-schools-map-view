## Why

The project has no deployment story at all today: no Dockerfile, no CI, no
hosting target. `data/schools.sqlite3` is gitignored and produced by a manual,
rate-limited scraping pipeline, which makes "how does a server get the data"
an open question. The app itself is a small, read-mostly monolith (FastAPI
serving both `/api/*` and the built frontend from one origin) with tiny data
(652KB DB), so it doesn't need heavyweight infrastructure — it needs a simple,
low-cost, low-maintenance path from `git push` to a running, always-on
instance.

## What Changes

- Commit `data/schools.sqlite3` to git instead of gitignoring it. The API only
  ever reads the DB at request time, so a committed, occasionally-refreshed
  snapshot is sufficient — no persistent volume or runtime pipeline needed.
  **BREAKING**: refreshing school/admissions data now requires a commit +
  redeploy; the API no longer picks up a scraper/geocoder rerun without a
  restart (see Modified Capabilities below).
- Add a multi-stage `Dockerfile`: a Node stage builds the frontend
  (`pnpm build`), a Python runtime stage copies in `frontend/dist` and the
  committed `data/schools.sqlite3`, then runs `schools-map-api`.
- Add `fly.toml` targeting a single always-on Fly.io machine
  (shared-cpu-1x, 256MB, no volume) on the default `*.fly.dev` subdomain.
- Add a GitHub Actions workflow:
  - On push/PR: run `pytest` and the frontend build/lint as a merge gate.
  - On merge to `main` (after the gate passes): build the Docker image and
    deploy it to Fly.io via `flyctl deploy`.
- Document the manual data-refresh convention (run `scrape-p1` +
  `geocode-schools` locally, commit the refreshed DB, push) in the README,
  since it now doubles as the only way to ship new data.
- Configure secrets: `ONEMAP_EMAIL`/`ONEMAP_PASSWORD` as Fly secrets (needed
  at runtime for the live `/api/geocode` search endpoint), `FLY_API_TOKEN` as
  a GitHub Actions secret.

## Capabilities

### New Capabilities
- `deployment-pipeline`: building a deployable image, running CI checks as a
  merge gate, and deploying that image to an always-on Fly.io machine on
  merges to `main`.

### Modified Capabilities
- `schools-map-api`: the "Data changes after a scraper/geocoding rerun"
  requirement no longer holds in the deployed environment — the DB is baked
  into the image at build time, so picking up refreshed data requires a new
  deploy rather than being visible to a running instance without a restart.

## Impact

- **Repo**: un-gitignore `data/schools.sqlite3`; new `Dockerfile`, `fly.toml`,
  `.github/workflows/deploy.yml`.
- **README**: replace "Running the app locally" production-style section
  framing with an explicit "deploying" section describing the commit-and-push
  data refresh convention.
- **Secrets/config**: two new Fly.io secrets (OneMap credentials), one new
  GitHub Actions secret (`FLY_API_TOKEN`); a new Fly.io account/app.
- **No code changes** to `src/schoolsmap` or `src/p1data` — this is packaging
  and CI/CD only.
