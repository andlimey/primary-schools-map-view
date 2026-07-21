## Context

sgschooling.com publishes P1 admission phase and balloting data as server-rendered HTML, one page per intake year (`/year/{YYYY}/`). The project's `schools_information.csv` (337 MOE schools, 179 tagged `PRIMARY`) has no admission data and no site-compatible identifier — the site uses abbreviated names/slugs (`admiralty`) while the CSV uses full official names (`ADMIRALTY PRIMARY SCHOOL`). The project was a blank slate with no language or storage convention established.

## Goals / Non-Goals

**Goals:**
- Scrape P1 phase-by-phase admission figures (vacancy/applied/taken) and balloting detail (category, applicants, vacancies) for 2022-2025.
- Join scraped schools to the 179 CSV primary schools reliably, surfacing ambiguous/failed matches for manual review rather than guessing.
- Store the result in a form any future language/frontend can query, without standing up a server.
- Make the scraper safely re-runnable (no duplicate rows, no FK drift) as the site's data updates yearly.

**Non-Goals:**
- Map UI, hover/click interactions, or any frontend — future work.
- Geocoding postal codes to lat/long — future work.
- 2021 data — it uses a different phase schema (2A split into 2A(1)/2A(2)) and was excluded as an edge case; the parser still reads headers dynamically so it can be added later without a redesign.
- A backend/API server — the dataset is small (~179 schools × 4 years × 6-7 phases) and updates once a year, so a server was judged unnecessary for this phase.

## Decisions

- **Python for the scraper, decoupled from the rest of the app.** The eventual map/frontend may be a different stack; the scraper has no dependency on that choice. Managed with `uv` (not pip) — `uv sync` creates and uses a project-local `.venv`, never global Python.
- **SQLite over JSON files or a backend service.** Relational (schools / admission_phases / balloting_details) fits the query pattern "N years of data for school X" via indexed joins, is portable as a single file, and needs no server to run or host — appropriate given the small, infrequently-updated dataset.
- **Dynamic phase-header parsing, not hardcoded columns.** The site's phase columns are read from each year's `<th>` row at scrape time rather than assumed to be a fixed 6-phase layout, since the schema is known to vary by year (verified: 2022-2025 all use 6 phases; 2021 uses 7). This makes adding years later a config change, not a code change.
- **Conservative join, never auto-accepting fuzzy matches.** `schools_information.csv` has real ambiguity (e.g. `ANGLO-CHINESE SCHOOL (JUNIOR)` vs `(PRIMARY)` are distinct schools; CHIJ has many parenthetical variants) that a naive suffix-strip or fuzzy match would silently mismatch. The join only auto-accepts an exact normalized match or an explicit entry in the hand-maintained `data/school_slug_overrides.csv`; everything else is logged to `logs/unmatched_schools_*.csv` with fuzzy suggestions for one-time human curation. Parenthetical-suffixed names skip suffix-stripping entirely (see `normalize.candidate_keys`), since the parenthetical qualifier is what distinguishes otherwise-identical schools.
- **No `ballot_chance_pct` or raw tooltip text stored.** Both are fully derivable from `applicants`/`vacancies` (or reconstructable from the structured fields already captured: `category_code`, `category_label`, `applicants`, `vacancies`), so storing them would be redundant data that could drift from the source numbers.
- **Idempotent by design, not by accident.** `schools` uses `INSERT ... ON CONFLICT(school_name) DO UPDATE` (never delete-and-reinsert, which would drift `AUTOINCREMENT` ids and orphan foreign keys). `admission_phases`/`balloting_details` are replaced per-year (`DELETE ... WHERE year = ?` then insert) inside one transaction, so re-running the scraper for all years or a single year is always safe.

## Risks / Trade-offs

- [2022/2023 phase schema was unconfirmed before scraping] → Resolved empirically: both years use the same 6-phase layout as 2024/2025. No mitigation needed in retrospect, but the dynamic-header design would have absorbed a difference had one existed.
- [`taken` is a phase-level total, not necessarily equal to one balloting category's own vacancy count, when a phase has more than one balloting category] → Discovered during verification (e.g. Ai Tong 2024 Phase 2A: taken=108 total, one category's vacancies=27). Not a defect — the schema already stores `taken` (phase-level) and `balloting_details.vacancies` (category-level) as distinct fields; the risk was only in an incorrect verification assumption, since corrected.
- [Site HTML structure could change, breaking the parser] → Mitigated by locating the table via content signature (`{"Vacancy","Applied","Taken"} <= cell texts`) rather than table index, and by caching raw HTML per year (`cache/year_{YYYY}.html`) so parsing can be iterated on offline.
- [3 CSV-absent schools on the site: Catholic High, Maris Stella High, CHIJ St. Nicholas Girls'] → These are `MIXED LEVEL (P1-S4)` in the CSV, not tagged `PRIMARY`, so they're correctly out of the 179-school target set — confirmed via `unmatched_schools`, not a join bug.

## Migration Plan

Not applicable — this was a net-new capability with no prior state to migrate. Running `scrape-p1` is the only "deployment" step; it's already been run and `data/output.sqlite3` (gitignored) is populated.

## Open Questions

None outstanding for this phase. Adding 2021 data, geocoding, and the map UI are deferred to future changes.
