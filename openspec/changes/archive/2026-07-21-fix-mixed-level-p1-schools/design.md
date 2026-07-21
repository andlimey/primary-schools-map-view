## Context

`join_schools.load_primary_schools` (src/p1scraper/join_schools.py:17) filters `schools_information.csv` (337 rows) down to the candidate pool passed into `build_matches`, using `row["mainlevel_code"].strip() == "PRIMARY"` (179 rows). Three schools that do have a P1 intake — Catholic High School, CHIJ St. Nicholas Girls' School, Maris Stella High School — are tagged `MIXED LEVEL (P1-S4)` instead, because their MOE registration spans P1 through Secondary 4 on one school code. They're excluded from the pool entirely, so they never reach the matcher and never get inserted into the `schools` table, even though sgschooling.com publishes P1 balloting data for all three (confirmed present in `unmatched_schools` as `site_no_csv_match`).

The full set of `mainlevel_code` values in the CSV: `PRIMARY` (179), `SECONDARY (S1-S5)` (117), `SECONDARY (S1-S4)` (16), `JUNIOR COLLEGE` (10), `MIXED LEVEL (S1-JC2)` (10), `MIXED LEVEL (P1-S4)` (3), `CENTRALISED INSTITUTE` (1), `MIXED LEVEL (S1-S5, JC1-JC2)` (1). Only `MIXED LEVEL (P1-S4)` denotes a P1 intake; the other `MIXED LEVEL` variant (`S1-JC2`) is secondary/JC-only and must stay excluded.

Separately, while tracing what happens once these 3 are admitted to the pool: Catholic High and Maris Stella High have no apostrophes and will auto-match via existing suffix-stripping (verified directly against `candidate_keys`/`normalize_name`). CHIJ St. Nicholas Girls' would not — sgschooling.com renders every apostrophe as a curly `’` (U+2019; confirmed via grep across all 4 cached year pages, consistently, for every apostrophe'd school name on the site), but `normalize.normalize_name`'s regex (`[.'()]`) only strips the straight `'` (U+0027). Every other apostrophe'd `PRIMARY` school already sidesteps this gap through a hand-curated entry in `data/school_slug_overrides.csv` rather than through automatic normalization — CHIJ St. Nicholas Girls' simply never got one, because it was never in the candidate pool to need it.

## Goals / Non-Goals

**Goals:**
- Admit `MIXED LEVEL (P1-S4)` schools into the CSV candidate pool alongside `PRIMARY` schools.
- Get all 3 schools successfully matched and populated with 2022-2025 admission/balloting data after re-running the scraper.
- Keep the fix scoped to the eligibility predicate and the overrides data file — no changes to `normalize.py`'s matching logic or the `schools` table schema.

**Non-Goals:**
- Fixing curly-apostrophe handling generally in `normalize_name` — the existing, already-proven pattern for this class of name (manual override) is reused instead of introducing a second code path.
- Persisting `mainlevel_code` in the `schools` table — it remains a scrape-time-only filter, consistent with current design (`db.py` already excludes it from stored columns).
- Auditing whether other non-`PRIMARY`/non-`MIXED LEVEL (P1-S4)` rows should be included — out of scope; this change targets exactly the 3 schools identified.

## Decisions

- **Filter predicate: `mainlevel_code in {"PRIMARY", "MIXED LEVEL (P1-S4)"}`, not a substring/prefix check.** Considered `mainlevel_code.startswith("MIXED LEVEL (P1")` to be robust to a hypothetical future `MIXED LEVEL (P1-S5)` variant, but the CSV is a point-in-time MOE export with a small, enumerable set of values (8 distinct values across 337 rows, verified) — an explicit set is easier to review and audit than a prefix pattern, and a future new variant showing up as an unmatched site school (as these 3 did) is exactly the signal that already surfaces this class of gap. Rename `load_primary_schools` to `load_p1_schools` since "primary" no longer accurately describes the eligibility rule (a school with `MIXED LEVEL (P1-S4)` is not, strictly, a "primary school").
- **Fix CHIJ St. Nicholas Girls' via `school_slug_overrides.csv`, not by patching `normalize_name` to strip curly apostrophes.** This matches the established convention: every other apostrophe'd school already goes through overrides, not the normalizer. Changing `normalize_name` would be a broader behavioral change to the automatic-match path affecting all 179+ existing schools for a problem that already has a working, narrower solution in place.
- **No schema or `db.py` change.** `mainlevel_code` is consumed only inside `load_primary_schools`/`load_p1_schools` and discarded immediately after filtering; nothing downstream needs it.

## Risks / Trade-offs

- [Explicit set of eligible `mainlevel_code` values could miss a future MOE re-classification] → Mitigation: any newly-excluded school with real site data still surfaces as `site_no_csv_match` in `unmatched_schools`/the unmatched log, same detection mechanism that surfaced this issue — not silent.
- [Renaming `load_primary_schools` → `load_p1_schools` touches a public-ish function name used in `main.py` and tests] → Small, mechanical rename; caught immediately by running the test suite.
