## ADDED Requirements

### Requirement: Serve a single school's detail fields
The system SHALL expose an HTTP endpoint that returns, for a single school identified by id, its name, address, url_address, zone_code, nature_code, and mainlevel_code.

#### Scenario: Fetching an existing school's detail
- **WHEN** a client requests the school detail endpoint for a school id that exists
- **THEN** the response includes that school's name, address, url_address, zone_code, nature_code, and mainlevel_code

#### Scenario: Fetching a nonexistent school's detail
- **WHEN** a client requests the school detail endpoint for a school id that does not exist
- **THEN** the response indicates the school was not found rather than returning empty or null fields

### Requirement: Serve a single school's full admission history
The system SHALL expose an HTTP endpoint that returns, for a single school identified by id, its admission phase data for every year present in the dataset, including for each phase and year its label, vacancy count, applied count, taken count, and, for phases where balloting occurred, the balloting category code, category label, applicants, and vacancies.

#### Scenario: Fetching admissions history for a school with multi-year data
- **WHEN** a client requests the admissions history endpoint for a school that has admission phase records across multiple years
- **THEN** the response includes, for every year that school has records for, its phases with vacancy, applied, and taken counts, plus balloting detail for any phase where balloting occurred

#### Scenario: Fetching admissions history for a school with no data
- **WHEN** a client requests the admissions history endpoint for a school that has no admission phase records for any year
- **THEN** the response indicates no admission history is available rather than an error

#### Scenario: Fetching admissions history for a nonexistent school
- **WHEN** a client requests the admissions history endpoint for a school id that does not exist
- **THEN** the response indicates the school was not found
