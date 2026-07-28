## MODIFIED Requirements

### Requirement: Serve live data without a rebuild step
The system SHALL read school data directly from the database on each
request, without requiring a separate export or rebuild step to reflect
updates. The database backing a running deployed instance is fixed for that
instance's lifetime; picking up refreshed data requires deploying a new
instance built with the updated database, not restarting or waiting on the
existing one.

#### Scenario: Data changes during local development
- **WHEN** the underlying database file is updated by a scraper or geocoding
  batch run while a locally-run API process is pointed at that same file
- **THEN** subsequent requests to the schools list endpoint reflect the
  updated data without the API process being restarted

#### Scenario: Data changes require a new deployment in production
- **WHEN** school or admissions data needs to change for a deployed instance
- **THEN** the updated database must be included in a newly built and
  deployed image; the already-running instance does not pick up the change
  on its own

### Requirement: Serve all schools' most-recent-year admission data in one response
The system SHALL expose an HTTP endpoint that returns, in a single response,
every school's admission phase data for the most recent year present across
the dataset (a single global year, not computed per school), including for
each phase its label, vacancy count, applied count, taken count, and, for
phases where balloting occurred, the balloting category code, category
label, applicants, and vacancies.

#### Scenario: Fetching admissions data for all schools
- **WHEN** a client requests the admissions endpoint
- **THEN** the response includes the resolved most-recent year and, for every
  school that has admission phase records for that year, its phases with
  vacancy, applied, and taken counts, plus balloting detail for any phase
  where balloting occurred

#### Scenario: Schools with no data in the most recent year are excluded
- **WHEN** a school has no admission phase records for the most recent year
  present in the dataset (whether never matched to admission data, or its
  latest available year is older)
- **THEN** that school is omitted from the admissions response rather than
  included with null or empty phase data

#### Scenario: Most recent year is computed globally
- **WHEN** the most recent year present in the dataset changes (e.g. a new
  year is scraped and the resulting database is deployed)
- **THEN** subsequent requests to the admissions endpoint resolve "most
  recent year" against the new global maximum, applied uniformly to every
  school in the response, with no per-school special-casing and no code
  change — though for a deployed instance, seeing the new dataset at all
  requires that new deployment to have happened
