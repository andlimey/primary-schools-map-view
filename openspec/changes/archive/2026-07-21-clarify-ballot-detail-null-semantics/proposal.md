## Why

While querying the populated database, `balloting_details.applicants`/`vacancies` came back NULL for two shapes of row that look identical on disk but mean opposite things: (1) the 36 `#`-suffixed "category fully admitted, no leftover to ballot" rows, where the source tooltip already states the zero-leftover fact in prose but sometimes omits the redundant number, and (2) 332 "needs to ballot" rows from 2022–2023, where sgschooling.com's tooltip markup for those years never published applicant/vacancy counts at all, even though a real ballot with a real (unknown) count occurred. Collapsing both to the same NULL, or to the same anything, would either fabricate false zeros for real unpublished ballots or leave the fully-admitted case looking like an error condition. This change documents the distinction as an explicit spec requirement so it isn't accidentally collapsed by a future NULL-handling cleanup.

No consumer of this data exists yet (the map UI is unbuilt), so this change is spec-only for now: it locks in the intended semantics without modifying the scraper. The `#`-suffix normalization (writing 0/0 instead of NULL when the source omits figures for a fully-admitted category) is deliberately deferred to a future change, to be implemented once something actually consumes this data.

## What Changes

- Clarify the `p1-admission-data` spec's "Extract balloting detail when present" requirement to distinguish two NULL-figure cases that currently read as identical but are semantically different:
  - A "needs to ballot" category whose source tooltip omits applicant/vacancy figures (observed for all such categories in 2022–2023): figures are genuinely unknown, not zero, and MUST be stored as NULL rather than inferred.
  - A "fully admitted, no leftover to ballot" (`#`-suffixed) category whose source tooltip omits figures: this is documented as a case the system currently stores as NULL today, with the semantic note that the true value is known to be zero from the label text even when unstated numerically — leaving the actual normalization to a future change.
- No code changes. This documents current scraper behavior more precisely and records the reasoning for not conflating the two NULL cases.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `p1-admission-data`: adds a scenario under "Extract balloting detail when present" clarifying that NULL applicants/vacancies must be preserved (not defaulted) when a "needs to ballot" category's source tooltip omits figures, since NULL there means "unknown," not "zero."

## Impact

- Spec-only change: `openspec/specs/p1-admission-data/spec.md`.
- No code, schema, or data changes. `src/p1scraper/parse.py` behavior is unchanged; it already stores NULL in both cases today, which remains correct for the "needs to ballot" case and is called out as a known, deliberately-deferred gap for the `#`-suffixed case.
