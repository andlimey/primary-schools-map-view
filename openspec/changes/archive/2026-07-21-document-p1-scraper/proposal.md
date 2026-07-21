## Why

The primary-schools-map-view app needs Primary 1 (P1) admission balloting history per school to power its future map hover/click features, but this data doesn't exist anywhere structured — it's only published as an HTML table on a third-party site (sgschooling.com), one page per intake year. This change (already implemented and committed, prior to adopting the OpenSpec workflow) built a scraper and local storage for that data so the map feature has something to query. It's documented here retroactively to bring the completed work under OpenSpec tracking.

## What Changes

- Added a Python scraper (`src/p1scraper/`) that fetches `sgschooling.com/year/{YYYY}/` for 2022-2025, dynamically parses the phase-by-phase admission table (handles differing phase-column layouts across years without hardcoding), and extracts balloting detail (category, applicants, vacancies) from the page's tooltip markup.
- Added a SQLite schema (`schools`, `admission_phases`, `balloting_details`, `unmatched_schools`, `scrape_runs`) as the storage artifact, generated into `data/output.sqlite3`.
- Added a name-normalization join (`src/p1scraper/join_schools.py`) that matches `schools_information.csv` primary schools (179 of 337 rows) to the site's abbreviated school slugs, backed by a hand-curated overrides file (`data/school_slug_overrides.csv`) for ambiguous campus names (e.g. Anglo-Chinese School (Junior) vs (Primary)).
- Added a pytest suite (`tests/`) including an end-to-end verification against a real fixture, and ran the scraper to populate `data/output.sqlite3` with all 179 primary schools matched and 4 years of admission/balloting data.
- Project tooling: `uv`-managed Python project (`pyproject.toml`, `uv.lock`), git repo initialized and this work committed.

## Capabilities

### New Capabilities
- `p1-admission-data`: Scraping P1 admission phase and balloting data from sgschooling.com for a configurable set of years, joining it to the official school registry, and persisting it in a queryable local SQLite store.

### Modified Capabilities
(none — first capability introduced in this project)

## Impact

- New code: `src/p1scraper/` (config, fetch, parse, normalize, join_schools, db, main, schema.sql), `tests/`, `data/school_slug_overrides.csv`.
- New generated artifact (gitignored): `data/output.sqlite3`, `cache/year_{YYYY}.html`, `logs/unmatched_schools_*.csv`.
- New dependency footprint: `requests`, `beautifulsoup4`, `lxml` (runtime), `pytest` (dev), managed via `uv`.
- No impact on existing code — this is the first capability in the project; the map UI, hover/click interactions, and geocoding remain unbuilt and out of scope.
