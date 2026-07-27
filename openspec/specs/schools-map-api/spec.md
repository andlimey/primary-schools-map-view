# schools-map-api Specification

## Purpose
Serve geocoded school data and the built map frontend from a single HTTP origin, reading live from the database on every request.

## Requirements
### Requirement: List geocoded schools
The system SHALL expose an HTTP endpoint that returns, for every school that has been successfully geocoded, its id, slug, name, address, latitude, and longitude.

#### Scenario: Fetching all schools
- **WHEN** a client requests the schools list endpoint
- **THEN** the response includes id, slug, name, address, latitude, and longitude for every school that has a persisted coordinate

#### Scenario: Schools without coordinates are excluded
- **WHEN** a school has not been successfully geocoded (e.g. it is in the manual-review record with no persisted coordinate)
- **THEN** it is omitted from the schools list response rather than included with null coordinates

### Requirement: Serve live data without a rebuild step
The system SHALL read school data directly from the database on each request, without requiring a separate export or rebuild step to reflect updates.

#### Scenario: Data changes after a scraper/geocoding rerun
- **WHEN** the underlying database is updated by a scraper or geocoding batch run while the API is running
- **THEN** subsequent requests to the schools list endpoint reflect the updated data without the API service being redeployed or restarted

### Requirement: Serve the frontend application
The system SHALL serve the built map frontend's static assets from the same origin as the API.

#### Scenario: Requesting the app
- **WHEN** a client requests the site's root path
- **THEN** the backend serves the built frontend application's static assets, so the map and its API are reachable from a single origin

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
