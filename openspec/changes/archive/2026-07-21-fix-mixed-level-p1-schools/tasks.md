## 1. Eligibility Filter

- [x] 1.1 In `src/p1scraper/join_schools.py`, rename `load_primary_schools` to `load_p1_schools` and update its predicate to accept rows where `mainlevel_code` is `PRIMARY` or `MIXED LEVEL (P1-S4)`
- [x] 1.2 Update the call site in `src/p1scraper/main.py` (import and usage) to match the rename
- [x] 1.3 Update the log message in `main.py` that currently says "CSV primary schools" if it should reflect the broader eligible set

## 2. Overrides Data

- [x] 2.1 Add `CHIJ ST. NICHOLAS GIRLS' SCHOOL,chij-st-nicholas-girls` to `data/school_slug_overrides.csv`

## 3. Tests

- [x] 3.1 Update `tests/test_join_schools.py` (or add a new test module) to cover the eligibility predicate: a `MIXED LEVEL (P1-S4)` row is included in the candidate pool, a `MIXED LEVEL (S1-JC2)` row is excluded, a `PRIMARY` row is still included
- [x] 3.2 Run `uv run pytest` and confirm all tests pass

## 4. Data Refresh and Verification

- [x] 4.1 Re-run the scraper (`uv run python -m p1scraper.main --use-cache`, or force-refetch if cache is stale) to regenerate `data/output.sqlite3`
- [x] 4.2 Query `unmatched_schools` and confirm `catholic-high`, `chij-st-nicholas-girls`, and `maris-stella-high` no longer appear
- [x] 4.3 Query `schools`/`admission_phases` and confirm all 3 schools have `site_slug` set and phase records for 2022-2025
