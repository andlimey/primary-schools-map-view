## 1. Spec clarification (no code changes)

- [x] 1.1 Review the delta spec's new "A phase needing a ballot whose figures are not published by the source" scenario and the amended "fully admitted" scenario note for accuracy against `cache/year_2022.html`, `cache/year_2023.html`, `cache/year_2024.html`, `cache/year_2025.html`.
- [x] 1.2 Sync the delta spec into `openspec/specs/p1-admission-data/spec.md` and archive this change.

## 2. Deferred follow-up (tracked, not executed here)

- [ ] 2.1 When a consumer of `balloting_details` is introduced, open a follow-up change to normalize `#`-suffixed "fully admitted" NULL figures to 0/0 in `src/p1scraper/parse.py`, then re-run the scraper for 2022–2024 to backfill via the existing idempotent `replace_year_data` delete+reinsert.
