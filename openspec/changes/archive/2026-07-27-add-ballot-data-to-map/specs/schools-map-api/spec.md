## ADDED Requirements

### Requirement: Serve all schools' most-recent-year admission data in one response
The system SHALL expose an HTTP endpoint that returns, in a single response, every school's admission phase data for the most recent year present across the dataset (a single global year, not computed per school), including for each phase its label, vacancy count, applied count, taken count, and, for phases where balloting occurred, the balloting category code, category label, applicants, and vacancies.

#### Scenario: Fetching admissions data for all schools
- **WHEN** a client requests the admissions endpoint
- **THEN** the response includes the resolved most-recent year and, for every school that has admission phase records for that year, its phases with vacancy, applied, and taken counts, plus balloting detail for any phase where balloting occurred

#### Scenario: Schools with no data in the most recent year are excluded
- **WHEN** a school has no admission phase records for the most recent year present in the dataset (whether never matched to admission data, or its latest available year is older)
- **THEN** that school is omitted from the admissions response rather than included with null or empty phase data

#### Scenario: Most recent year is computed globally
- **WHEN** the most recent year present in the dataset changes (e.g. a new year is scraped)
- **THEN** subsequent requests to the admissions endpoint resolve "most recent year" against the new global maximum, applied uniformly to every school in the response, without a code change or redeploy
