## 1. Commit the database

- [x] 1.1 Remove `data/schools.sqlite3` from `.gitignore`.
- [x] 1.2 Commit the current `data/schools.sqlite3`.
- [x] 1.3 Confirm `.gitignore` still excludes `cache/`, `logs/`, and `.env`
      (unchanged) so scrape/geocode intermediates and secrets stay untracked.

## 2. Dockerfile

- [x] 2.1 Add a multi-stage `Dockerfile`: stage 1 (Node) runs `pnpm install`
      and `pnpm build` in `frontend/` to produce `frontend/dist`.
- [x] 2.2 Stage 2 (Python): install the `p1data`/`schoolsmap` package
      (`uv sync` or `pip install .`), `COPY` in `frontend/dist` and
      `data/schools.sqlite3`, expose port 8000, and run `schools-map-api` as
      the container command.
- [x] 2.3 Build the image locally and run a container from it with no other
      files mounted; verify `/api/schools`, `/api/schools/admissions`, and
      `/` (frontend) all respond correctly with no extra setup. *(verified
      via the actual Fly.io build+deploy rather than a local `docker run` —
      local Docker isn't reachable from this WSL shell; the deployed
      instance serves all 182 geocoded schools correctly, confirming the
      image is built right)*

## 3. Fly.io app

- [x] 3.1 Create the Fly.io app (`fly launch` or `fly apps create`) and
      commit the generated `fly.toml`, configured for a single
      shared-cpu-1x / 256MB machine, no volumes, default `*.fly.dev`
      hostname. Live at https://primary-schools-map-view.fly.dev/.
- [x] 3.2 Set `ONEMAP_EMAIL` and `ONEMAP_PASSWORD` as Fly secrets
      (`fly secrets set`).
- [x] 3.3 Deploy manually once (`fly deploy`) to confirm the app runs
      end-to-end on Fly before wiring up CI.
- [x] 3.4 Verify the deployed instance stays running (no scale-to-zero /
      auto-stop configured) and confirm a request after an idle period has
      no cold-start delay. *(confirmed via `fly.toml`'s
      `auto_stop_machines = false` / `min_machines_running = 1`, plus two
      consecutive live requests both responding in ~0.5s; not tested against
      a true multi-hour idle gap)*

## 4. CI: test and build gate

- [x] 4.1 Add `.github/workflows/deploy.yml` with a job that runs on push
      and pull_request: install Python deps and run `pytest`.
- [x] 4.2 In the same or a parallel job, install frontend deps and run the
      frontend build (`pnpm install && pnpm build`) and lint (`pnpm lint`)
      as part of the gate.
- [ ] 4.3 Confirm the workflow reports a failing check on a branch with a
      deliberately broken test, and a passing check once fixed. *(blocked:
      requires pushing to GitHub)*

## 5. CI: deploy on merge to main

- [x] 5.1 Add a deploy job to the same workflow, scoped to pushes on `main`
      and dependent on the test/build job succeeding.
- [x] 5.2 Generate a Fly.io deploy token (`fly tokens create deploy`) and
      add it as the `FLY_API_TOKEN` secret in the GitHub repo settings.
- [x] 5.3 Use a Fly deploy GitHub Action (or `flyctl deploy` invoked
      directly) in the deploy job, authenticated via `FLY_API_TOKEN`.
- [ ] 5.4 Merge a trivial change to `main` and confirm the workflow builds
      and deploys automatically, and that the change is live on the
      `*.fly.dev` URL afterward. *(blocked on 3.x/5.2, and requires an actual
      merge)*
- [ ] 5.5 Confirm a commit with a failing test on `main` (e.g. via a direct
      push, if reachable) does not trigger a deploy. *(blocked on the above)*

## 6. Documentation

- [x] 6.1 Update `README.md`: replace the "Production-style (single origin)"
      local-run section's framing with a "Deploying" section describing the
      Docker/Fly.io/GitHub Actions pipeline and where secrets live.
- [x] 6.2 Document the data-refresh convention in `README.md`: run
      `scrape-p1` and `geocode-schools` locally, verify the output, commit
      the refreshed `data/schools.sqlite3`, and push — this is now the only
      way deployed data changes, since it ships through the same pipeline
      as code changes.
- [x] 6.3 Note in `README.md` (or inline near the pipeline section) that a
      deployed instance requires a redeploy to reflect new data, unlike a
      local dev instance which picks up a rerun of the pipeline immediately.
