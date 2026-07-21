## MODIFIED Requirements

### Requirement: Extract balloting detail when present
The system SHALL extract, for any phase where balloting occurred, the citizenship/distance category code, category label, number of applicants, and number of vacancies for that category, from the page's tooltip markup. Where the source tooltip omits the applicant/vacancy figures, the system SHALL store them as NULL rather than inferring a value, except where noted below for the fully-admitted case.

#### Scenario: A phase with balloting
- **WHEN** a "Taken" cell contains a tooltip span indicating balloting occurred (e.g. "SC within 1km needs to ballot", Applicants: 74, Vacancies: 52)
- **THEN** the system stores a balloting detail record for that phase with category_code="SC<1", category_label="SC within 1km needs to ballot", applicants=74, vacancies=52

#### Scenario: A phase without balloting
- **WHEN** a "Taken" cell has no tooltip span
- **THEN** no balloting detail record is created for that phase, and the plain taken count is still recorded

#### Scenario: A phase where a category is fully admitted with no ballot needed
- **WHEN** a "Taken" cell's tooltip indicates a category was fully admitted with no leftover applicants to ballot (e.g. category code suffixed `#`, "Ballot Chance: 100%")
- **THEN** the system still records the balloting detail record with the applicants and vacancies figures as given (which may both be 0), rather than treating it as an error
- **NOTE**: for years where the source tooltip states the fully-admitted fact only as text (e.g. "SC within 1km all admitted, no leftover for further ballot") without numeric Applicants/Vacancies lines, the system currently stores NULL for both figures rather than inferring 0. This is a known gap distinct from the scenario below — the true value is knowable (zero) from the label text even when unstated — and is intentionally left as-is pending a future change, since the numeric distinction has no consumer yet.

#### Scenario: A phase needing a ballot whose figures are not published by the source
- **WHEN** a "Taken" cell's tooltip indicates a category needs to ballot (no `#` suffix, no "fully admitted" wording) but the source omits the Applicants/Vacancies lines entirely (observed for all such categories on sgschooling.com in intake years 2022 and 2023)
- **THEN** the system stores the balloting detail record with applicants and vacancies as NULL, since a ballot with an unknown-but-nonzero count occurred and the true figures cannot be recovered or safely inferred as zero
