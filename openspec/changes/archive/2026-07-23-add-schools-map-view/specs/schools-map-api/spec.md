## ADDED Requirements

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
