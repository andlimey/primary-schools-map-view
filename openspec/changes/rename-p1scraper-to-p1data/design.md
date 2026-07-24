## Context

`p1scraper` currently holds five kinds of things: HTTP scraping (`fetch.py`, `parse.py`, `main.py`), normalization (`normalize.py`), geocoding (`geocode.py`, `geocode_main.py`, `onemap.py`), DB access (`db.py`, `schema.sql`), and shared config (`config.py`, `models.py`). `schoolsmap` (the FastAPI app) already imports `config` and `db` from it. [`add-location-search`](../add-location-search/design.md) will add a second cross-package dependency (`onemap.search()`), making the "scraper" name more misleading, not less.

## Goals / Non-Goals

**Goals:**
- Package name reflects what's actually inside: the P1 admission data pipeline (scrape → normalize → geocode → store), which `schoolsmap` sits on top of.
- Every internal reference (imports, `pyproject.toml`, README) updated consistently in one pass, so there's no lingering mix of old/new names.
- Zero behavior change — this is purely an identifier rename.

**Non-Goals:**
- Splitting the package further (e.g. extracting `db`/`config`/`onemap` into a third shared package). The current single-package structure isn't broken, just misnamed; a deeper split isn't justified by this problem.
- Changing the CLI command names (`scrape-p1`, `geocode-schools`, `schools-map-api`) — those are already fine as user-facing names; only the module paths behind them change.
- Publishing to PyPI or any external registry — this is a local/private project, so there's no external-consumer compatibility concern to manage.

## Decisions

### New name: `p1data`
Chosen over `p1core`/`schoolsdata` (the other options raised in discussion) because it names the concrete thing the package produces and owns — the P1 admission dataset (scraped, normalized, geocoded, persisted) — rather than an abstract architectural role ("core") or a scope claim broader than what's implemented ("schoolsdata" implies more than P1-specific data). It also pairs naturally with the existing `schoolsmap` name: `p1data` produces the data, `schoolsmap` serves it.

### Single mechanical rename, not a re-split
Move `src/p1scraper/` to `src/p1data/` as one directory rename, update every `from p1scraper import ...` to `from p1data import ...`, update `pyproject.toml`'s `name` and `[project.scripts]` targets, and update the README's package-layout description. No file is split or restructured beyond the rename itself — keeping the change reviewable as "a rename" rather than "a rename plus a reorg."

### Editable install must be reinstalled, not hand-patched
`src/p1scraper.egg-info/` is generated metadata from the current editable install (`pip install -e` / `uv sync`); it's regenerated as `p1data.egg-info` automatically by re-running the install after the rename, rather than manually edited or deleted mid-change.

## Risks / Trade-offs

- **[Risk]** A missed import site (`from p1scraper import ...` left unchanged somewhere) fails at runtime/import-time rather than silently — **Mitigation**: the full grep-derived file list is enumerated in tasks.md; run the test suite after the rename to catch anything missed (an `ImportError` surfaces immediately).
- **[Risk]** Stale `.egg-info`/`__pycache__` directories under the old name linger and confuse tooling or editors — **Mitigation**: remove `src/p1scraper.egg-info/` and any `__pycache__` under the old path as part of the rename, then reinstall.
- **[Risk]** This lands after `add-location-search` starts touching `p1scraper.onemap`, creating a merge/rebase conflict between the two changes — **Mitigation**: sequencing is a rollout decision (see tasks.md), not a design concern; either land this first, or land it after and update the one new import site `add-location-search` introduces.
