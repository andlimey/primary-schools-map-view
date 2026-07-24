## 1. Rename the package directory

- [x] 1.1 `git mv src/p1scraper src/p1data`
- [x] 1.2 Remove the stale `src/p1scraper.egg-info/` directory (regenerated under the new name by the reinstall in section 4).

## 2. Update internal imports and references

- [x] 2.1 In every file under `src/p1data/` (`parse.py`, `fetch.py`, `main.py`, `geocode_main.py`, `join_schools.py`, `onemap.py`, `geocode.py`, `config.py`, `db.py`, and any others matching `from p1scraper import` / `import p1scraper`), update the import to `p1data`.
- [x] 2.2 Update `src/schoolsmap/api.py`'s import of `p1scraper` (`config`, `db`) to `p1data`.
- [x] 2.3 Update `config.py`'s `USER_AGENT` string (`"p1scraper/0.1 ..."`) to reference `p1data` for consistency, unless there's a reason to keep the HTTP User-Agent string stable for the scraped site (sgschooling.com) — check before changing.
- [x] 2.4 Update test imports in `tests/test_db.py`, `tests/test_verification.py`, `tests/test_parse.py`, `tests/test_join_schools.py`, `tests/test_normalize.py`, `tests/test_api.py`.

## 3. Update packaging and docs

- [x] 3.1 `pyproject.toml`: change `name = "p1scraper"` to `name = "p1data"`.
- [x] 3.2 `pyproject.toml`: update `[project.scripts]` entries `p1scraper.main:main` → `p1data.main:main` and `p1scraper.geocode_main:main` → `p1data.geocode_main:main`. Leave the command names themselves (`scrape-p1`, `geocode-schools`, `schools-map-api`) unchanged.
- [x] 3.3 `README.md`: update the package description and directory-layout comment that currently reference `p1scraper`.

## 4. Reinstall and verify

- [x] 4.1 Reinstall the editable package (`uv sync` or `pip install -e ".[dev]"`) so `p1data.egg-info` is generated and the old `p1scraper` import path is no longer resolvable.
- [x] 4.2 Run the full test suite (`pytest`) and confirm it passes with no `p1scraper` import errors.
- [x] 4.3 Grep the repo for any remaining `p1scraper` references (`grep -rn p1scraper --include="*.py" --include="*.toml" --include="*.md" .`) and confirm only intentional historical references remain (e.g. old changelog/archive entries, if any — this project's `openspec/changes/archive/` history should be left as-is since it documents the past, not renamed retroactively).
- [x] 4.4 Manually run `scrape-p1 --help`, `geocode-schools --help`, and `schools-map-api` to confirm the entry points still resolve correctly after the rename.
