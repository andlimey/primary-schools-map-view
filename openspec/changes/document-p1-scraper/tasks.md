## 1. Project Scaffold

- [x] 1.1 Set up `pyproject.toml` (uv-managed, `src/`-layout package `p1scraper`) and `.gitignore`
- [x] 1.2 Create `src/p1scraper/` package structure and `data/`, `cache/`, `logs/`, `tests/fixtures/` directories

## 2. Storage Layer

- [x] 2.1 Write `schema.sql`: `schools`, `admission_phases`, `balloting_details`, `scrape_runs`, `unmatched_schools` tables with appropriate indexes and foreign keys
- [x] 2.2 Write `db.py`: schema init, idempotent `upsert_schools` (ON CONFLICT DO UPDATE keyed on `school_name`), per-year `replace_year_data` (scoped DELETE + insert), `record_unmatched_schools`, `record_scrape_run`

## 3. Scraping and Parsing

- [x] 3.1 Write `fetch.py`: HTTP fetch with descriptive User-Agent, optional HTML disk cache for offline dev/testing
- [x] 3.2 Write `parse.py`: locate the admissions table by content signature, parse phase headers dynamically from `<th>` text, walk school blocks (name row + Vacancy/Applied/Taken rows), extract plain cell values and tooltip balloting detail (`data-tt`/`data-tt-title`)
- [x] 3.3 Write `models.py` and `normalize.py` (phase-code normalization, e.g. `2A(1)` → `2A_1`)

## 4. School Join

- [x] 4.1 Write `join_schools.py`: load CSV primary schools, normalize names, progressive suffix-stripping (skipping parenthetical-suffixed names), fuzzy-suggestion generation for unmatched schools, overrides file support
- [x] 4.2 Write `main.py` CLI orchestration: fetch → parse → union site schools across years → join → store, with `--years`/`--db-path`/`--use-cache`/`--force-refetch` flags

## 5. Testing

- [x] 5.1 Build HTML fixture from real scraped 2025 data (Admiralty block) plus a synthetic 7-column fixture for dynamic-header coverage
- [x] 5.2 Write unit tests: `test_normalize.py`, `test_parse.py`, `test_join_schools.py`, `test_db.py`
- [x] 5.3 Write `test_verification.py`: end-to-end reproduction of the ground-truth example (Admiralty 2025 Phase 2C: 87 applied, 52 vacancies, 74 applicants balloting for "SC within 1km")
- [x] 5.4 Run `uv run pytest` — all tests passing

## 6. Data Population and Verification

- [x] 6.1 Run scraper for 2022-2025; review `logs/unmatched_schools_*.csv`
- [x] 6.2 Build `data/school_slug_overrides.csv` for ambiguous campus names (ACS Junior/Primary, CHIJ variants, St./Saint punctuation cases) — resolved 19 of 19 unmatched CSV schools
- [x] 6.3 Confirm remaining unmatched site schools (Catholic High, Maris Stella High, CHIJ St. Nicholas Girls') are legitimately out of scope (`MIXED LEVEL (P1-S4)`, not `PRIMARY`)
- [x] 6.4 Verify ground-truth query against `data/output.sqlite3` matches the user's original example exactly
- [x] 6.5 Verify dataset-wide invariants (`applicants >= vacancies`, `taken >= category vacancies`) hold with zero violations across all 686 balloting records
- [x] 6.6 Verify idempotency: re-run scraper, confirm identical row counts

## 7. Project Housekeeping

- [x] 7.1 Initialize git repository
- [x] 7.2 Commit scraper implementation and generated overrides file (generated DB/cache/logs excluded via `.gitignore`)
