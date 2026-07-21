## Context

`balloting_details.applicants`/`vacancies` are NULL for 368 of the 730 rows currently in `data/output.sqlite3`, split across two categories that look identical on disk:

- 332 rows: a "needs to ballot" category (no `#` suffix) in intake years 2022–2023, where sgschooling.com's tooltip markup for those years never included Applicants/Vacancies/Ballot Chance lines at all — verified directly against `cache/year_2022.html` and `cache/year_2023.html`.
- 36 rows: a `#`-suffixed "fully admitted, no leftover to ballot" category, where the tooltip's prose already states the zero-leftover fact, but the numeric Applicants/Vacancies lines are only present starting in the 2025 source page (16 of 52 `#` rows, all 2025, are 0/0; the other 36 are NULL/NULL).

There is no consumer of this table yet — the map UI is unbuilt — so nothing today depends on resolving either NULL case.

## Goals / Non-Goals

**Goals:**
- Make the spec explicit about what NULL means in each case, so the distinction survives future refactors.
- Record, without implementing, the decision to eventually normalize the `#`-suffixed case to 0/0.

**Non-Goals:**
- Changing `src/p1scraper/parse.py` to perform the `#`-suffix normalization. Deferred to a future change once a consumer exists.
- Backfilling or migrating any existing rows in `data/output.sqlite3`.
- Handling the 2022–2023 "needs to ballot" reporting gap by imputing, estimating, or otherwise deriving a non-NULL value — this design explicitly keeps those NULL.

## Decisions

**Decision: NULL is preserved (not defaulted) for "needs to ballot" categories with omitted source figures.**
A "needs to ballot" label asserts that demand exceeded vacancies — the true applicant count is unknown but provably nonzero. Storing 0 would fabricate a false "no applicants" fact for a category that, by definition, had some. NULL is the only value that doesn't misrepresent the source. Confirmed via `ADMIRALTY PRIMARY SCHOOL` / category `SC<1`, which shows NULL/NULL in 2022–2023 and real figures (109/69, then 74/52) once the source started publishing them in 2024–2025 — same school, same category, same kind of event, different reporting completeness.

**Decision: the `#`-suffixed "fully admitted" NULL case is documented but not fixed in this change.**
Unlike the "needs to ballot" case, here the true value actually is knowable — the label text ("...all admitted, no leftover for further ballot") already discloses zero leftover applicants in prose, the site just doesn't always restate it numerically. Normalizing this to 0/0 at parse time (in `parse_taken_cell`, `src/p1scraper/parse.py:91`) would be safe and idempotent-compatible (`replace_year_data` does a full delete+reinsert per year, so re-scraping 2022–2024 after the fix would backfill automatically with no separate migration). This was scoped out of the current change specifically because nothing consumes the data yet, per the user's explicit choice to keep this change spec-only for now.

## Risks / Trade-offs

- [Risk] A future contributor sees 368 NULL rows and "cleans up" the table with a blanket `COALESCE(applicants, 0)`, silently fabricating zero applicant counts for the 332 genuine 2022–2023 reporting gaps. → Mitigation: the new spec scenario states explicitly that NULL must be preserved for that case; this design doc records the concrete Admiralty example as evidence.
- [Risk] Leaving the `#`-suffixed case unfixed means `applicants`/`vacancies` for that case reads as NULL despite being semantically zero, so any future consumer doing simple arithmetic over the column (e.g. summing applicants) must know to treat `#`-suffixed NULLs differently from other NULLs, or the deferred fix must land before such a consumer is built. → Mitigation: called out explicitly in the spec scenario's note and flagged here for whoever builds the next consumer.

## Open Questions

- Should the `#`-suffix normalization (writing 0/0 at parse time) be its own follow-up change once the map UI needs this data, or bundled into whatever change introduces the first real consumer? Left open; not blocking this spec-only change.
