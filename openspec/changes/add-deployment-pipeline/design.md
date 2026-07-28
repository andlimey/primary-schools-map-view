## Context

The app is a single FastAPI process that serves both `/api/*` and the built
React frontend (`frontend/dist`) from one origin, backed by a 652KB SQLite
file (`data/schools.sqlite3`) that the API only ever *reads* at request time.
The DB is currently gitignored and produced by a manual, rate-limited,
two-step pipeline (`scrape-p1`, `geocode-schools`) run locally against
sgschooling.com and OneMap. There is no Dockerfile, no CI, and no hosting
target today. `/api/geocode` calls OneMap live using credentials from a local
`.env` file, so production needs those credentials available at runtime too.

Traffic is expected to be low (personal/small-audience tool), and data
changes infrequently (P1 balloting results are published roughly once a
year), so the design favors low ongoing cost and low operational effort over
scalability or zero-downtime data refresh.

## Goals / Non-Goals

**Goals:**
- Get from `git push` to a running, always-on instance with no manual server
  steps per deploy.
- Keep hosting cost low (a few $/mo) and avoid cold starts.
- Keep the data refresh workflow simple: a human runs the pipeline locally,
  commits the result, and it ships through the normal deploy path.
- Gate deploys on the existing test suite passing.

**Non-Goals:**
- Automating the scrape/geocode pipeline on a schedule. It runs against a
  third-party site with deliberate rate-limiting and a personal OneMap
  account; running it unattended from CI adds real failure surface (blocked
  IPs, silent breakage) for a task that happens ~once a year. Out of scope
  for this change.
- Zero-downtime rolling data updates without a redeploy. Explicitly traded
  away — see Decisions.
- A custom domain. Fly's default `*.fly.dev` subdomain is sufficient for now.
- Multi-region or multi-instance deployment. A single machine is enough for
  the expected traffic.

## Decisions

### Commit `data/schools.sqlite3` instead of gitignoring it
The API only reads the DB; nothing in the request path writes to it. At
652KB and refreshed roughly annually, it behaves like versioned data (no
different from the already-committed `schools_information.csv`), not like
application state. Committing it means every deploy target — container
build, CI, a future contributor's checkout — gets a working DB for free,
with no separate provisioning step, object storage, or startup fetch.

Alternative considered: keep it gitignored and fetch it from object storage
(S3/R2) at container startup. Rejected as unnecessary infrastructure for a
652KB file that changes a few times a year — it adds a startup dependency
and a place for the fetch to silently fail with no corresponding benefit.

### Bake the DB into the Docker image at build time (no persistent volume)
Because the DB is committed and read-only at runtime, the multi-stage
Dockerfile can just `COPY` it into the image alongside the built frontend.
Fly.io machines can run with no attached volume at all.

Alternative considered: mount a persistent volume and let a
still-manually-triggered pipeline run against the deployed instance to
update the DB in place, preserving the existing "no redeploy needed"
requirement. Rejected — it reintroduces exactly the operational surface
this design avoids (running the scraper from the production host, managing
volume backups/migrations) for a benefit (avoiding a ~1-2 minute redeploy
once a year) that doesn't justify the cost.

### Fly.io, single always-on shared-cpu-1x/256MB machine
Matches the stated priority: always-on (no cold starts) at a small,
predictable monthly cost, without owning OS patching, TLS, or a reverse
proxy (Fly handles TLS termination and health checks). A machine sized for
a low-traffic FastAPI app serving small JSON payloads and static assets is
sufficient.

Alternatives considered:
- **Render free tier**: $0/mo, but sleeps after 15 min idle, which was
  explicitly ruled out once cold-start behavior was understood.
- **Self-managed VPS / Oracle Cloud Always Free**: comparable or lower cost,
  but the operator owns nginx/Caddy config, TLS renewal, and OS security
  patching indefinitely. More control, more ongoing effort — not the
  tradeoff wanted here.
- **Split frontend (CDN) + API (serverless)**: would need either a
  network-backed SQLite (e.g. Turso) or a migration to Postgres, plus
  reintroduces CORS across two origins. Not justified by this app's mostly
  single-region, low-traffic audience.

### GitHub Actions: test-gate on push/PR, deploy on merge to `main`
Standard, low-effort CI/CD shape that matches the existing `pytest` suite
and adds a frontend build/lint check that doesn't exist today. Deploy only
fires after the gate passes and only on `main`, so a broken PR can never
reach production.

### Secrets: Fly secrets for OneMap credentials, GitHub secret for the Fly token
`ONEMAP_EMAIL`/`ONEMAP_PASSWORD` are needed by the running container (live
`/api/geocode` calls), so they're set as Fly app secrets, not baked into the
image. `FLY_API_TOKEN` authorizes the GitHub Actions deploy step and is
stored as a GitHub Actions repository secret. Neither secret is ever
written to a file that gets committed or logged.

## Risks / Trade-offs

- **[Risk] Data refresh now requires a redeploy** (previously: the API
  reflected an updated DB file without restart, per the existing
  `schools-map-api` "Serve live data without a rebuild step" requirement).
  → Mitigation: this is an accepted, explicit tradeoff (see proposal's
  Modified Capabilities) in exchange for not needing persistent storage or
  a runtime pipeline. A redeploy is a `git push` and a few minutes, and data
  changes roughly once a year.
- **[Risk] Committing a binary SQLite file to git** grows repo size on every
  data refresh (git can't diff binary files efficiently) and is unconventional.
  → Mitigation: the file is small (652KB) and changes infrequently (~yearly),
  so repo bloat over time is minimal; this is called out explicitly rather
  than done silently.
- **[Risk] Fly.io pricing/free-tier terms can change.** → Mitigation: verify
  current Fly.io pricing before provisioning the app; the design doesn't
  depend on any specific promotional tier, just "one small always-on
  machine."
- **[Risk] `/api/geocode` depends on a live OneMap account.** If the account
  or credentials become invalid, or OneMap's auth API changes, live search
  breaks in production with no local fallback to notice it quickly.
  → Mitigation: out of scope for this change (pre-existing dependency, not
  introduced by it), but worth a follow-up (e.g. a periodic health check)
  if this becomes a recurring problem.

## Migration Plan

1. Un-gitignore `data/schools.sqlite3` and commit the current DB.
2. Add `Dockerfile`, `fly.toml`, `.github/workflows/deploy.yml`.
3. Create the Fly.io app and set `ONEMAP_EMAIL`/`ONEMAP_PASSWORD` as Fly
   secrets; add `FLY_API_TOKEN` as a GitHub Actions secret.
4. Verify the workflow end-to-end with a first manual/triggered deploy.
5. Update the README with the deployment overview and the "refresh data →
   commit → push" convention.

Rollback: Fly.io keeps prior image releases, so `flyctl deploy` can target a
previous release, or `flyctl releases rollback`, to revert a bad deploy
without needing a git revert first.

## Open Questions

- None outstanding — Fly.io, no custom domain, and manual/committed data
  refresh were confirmed during exploration.
