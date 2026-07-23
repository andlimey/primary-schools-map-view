# school-geocoding Specification

## Purpose
Resolve each school's postal code/address to geographic coordinates via OneMap, validate and cache the results, and record schools that cannot be confidently geocoded for manual review.

## Requirements
### Requirement: Normalize postal code before lookup
The system SHALL zero-pad a school's `postal_code` on the left to 6 digits before using it in any geocoding lookup.

#### Scenario: 5-digit postal code is zero-padded
- **WHEN** a school's `postal_code` has fewer than 6 digits (e.g. `88256`)
- **THEN** it is zero-padded to 6 digits (e.g. `088256`) before being sent to the geocoding provider

### Requirement: Authenticate with OneMap before geocoding
The system SHALL obtain an OneMap access token before issuing any search requests and SHALL send that token on every search request in the batch run.

#### Scenario: Token obtained before batch run
- **WHEN** the geocoding batch job starts
- **THEN** it requests an access token from OneMap's token endpoint using configured credentials, and includes that token on every subsequent search request made during the run

### Requirement: Geocode by postal code first, address as fallback
The system SHALL attempt to geocode each school by its zero-padded postal code first, and SHALL only attempt geocoding by address if the postal code lookup fails to return a usable result.

#### Scenario: Postal code resolves
- **WHEN** searching OneMap by a school's zero-padded postal code returns at least one usable result
- **THEN** the school's coordinates are derived from that result, `geocode_source` is recorded as `postal_code`, and no address lookup is performed

#### Scenario: Postal code fails, address resolves
- **WHEN** searching OneMap by postal code returns no results or an error
- **THEN** the system searches OneMap by the school's address, and if that search returns at least one usable result, coordinates are derived from it and `geocode_source` is recorded as `address`

#### Scenario: Both postal code and address fail
- **WHEN** searching OneMap by both postal code and address return no results
- **THEN** no coordinates are persisted for the school, and it is recorded in the manual-review record instead

### Requirement: Disambiguate multiple results sharing a postal code
The system SHALL NOT default to the first result when a postal code search returns more than one result; it SHALL select the result whose building name matches the school's own name.

#### Scenario: Multiple entities share a postal code
- **WHEN** a postal code search returns more than one result
- **THEN** the system selects the result whose building name matches the school's own name, rather than defaulting to the first result returned

#### Scenario: No confident match among multiple results
- **WHEN** a postal code search returns more than one result and none of their building names sufficiently match the school's name
- **THEN** the school is recorded in the manual-review record rather than a result being guessed

### Requirement: Validate coordinates before persisting
The system SHALL reject and not persist any resolved coordinate that falls outside Singapore's geographic bounding box.

#### Scenario: Coordinate outside Singapore
- **WHEN** a resolved coordinate falls outside Singapore's bounding box
- **THEN** the coordinate is not persisted, and the school is recorded in the manual-review record

### Requirement: Cache raw geocoding responses
The system SHALL cache raw geocoding API responses on disk and SHALL reuse a cached response instead of issuing a new API request when the underlying postal code or address has not changed since the school was last successfully geocoded.

#### Scenario: Rerunning the batch job with unchanged data
- **WHEN** the geocoding batch job is re-run for a school that was already successfully geocoded in a prior run, and its `postal_code`/`address` values have not changed
- **THEN** the cached response is reused instead of issuing a new API request

### Requirement: Idempotent re-runs
The system SHALL support being re-run without altering previously-resolved coordinates for schools whose source data has not changed, and without duplicating manual-review records.

#### Scenario: Rerun after partial success
- **WHEN** the batch job is re-run after some schools were already geocoded and others were flagged for manual review
- **THEN** previously geocoded schools' coordinates are left unchanged (unless their `postal_code`/`address` changed), and only ungeocoded or changed schools are (re-)queried
