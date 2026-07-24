## Why

The `p1scraper` package no longer just scrapes — it holds scraping, normalization, geocoding (including the OneMap client), DB access, and shared config. The README already describes `src/p1scraper/` as "scraping, parsing, geocoding, and DB logic." The name was accurate when the package only ran the offline scrape-and-geocode pipeline; it stopped being accurate once `schoolsmap` (the live API) started depending on its config/db modules, and it'll be more strained once `schoolsmap` also depends on `onemap.py` for the live location-search geocoding proxy ([`add-location-search`](../add-location-search/proposal.md)). Renaming now, before that second cross-package dependency lands, avoids compounding the mismatch between the name and what's actually inside.

## What Changes

- **BREAKING** (internal only, no external consumers): rename the `src/p1scraper/` package to `src/p1data/`, updating every internal import (`from p1scraper import ...` → `from p1data import ...`) across the package itself, `schoolsmap`, and all tests.
- Update `pyproject.toml`: distribution `name`, and the `p1scraper.main:main` / `p1scraper.geocode_main:main` entries under `[project.scripts]` → `p1data.main:main` / `p1data.geocode_main:main`. The CLI command names themselves (`scrape-p1`, `geocode-schools`, `schools-map-api`) are unaffected — only the module paths they point at change.
- Update `README.md`'s description of the package layout to match.
- No behavior, requirement, or API change of any kind — this is a pure identifier rename plus the accompanying `pyproject.toml`/import mechanics.

## Capabilities

### New Capabilities
(none — no new user-facing or system behavior)

### Modified Capabilities
(none — no requirement or spec-level behavior changes; all existing specs remain accurate as-is)

## Impact

- `pyproject.toml`: `name`, `[project.scripts]` entries.
- `src/p1scraper/` → `src/p1data/` (directory move, all files unchanged in content except internal `p1scraper` references).
- `src/schoolsmap/api.py`: import path update.
- `tests/test_db.py`, `tests/test_verification.py`, `tests/test_parse.py`, `tests/test_join_schools.py`, `tests/test_normalize.py`, `tests/test_api.py`: import path updates.
- `README.md`: package layout description.
- Editable install metadata (`src/p1scraper.egg-info/`) regenerated under the new name as a side effect of reinstalling.
- No database schema, HTTP API, or frontend changes.
