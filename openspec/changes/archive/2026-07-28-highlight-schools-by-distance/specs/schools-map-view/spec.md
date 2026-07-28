## ADDED Requirements

### Requirement: Color-code pins by distance from a searched location
The system SHALL render a school's pin using a distinct "within 1km" color when a search location is active and that school's straight-line distance from it is less than 1km, a distinct "within 2km" color when that distance is between 1km and 2km, and the default pin appearance otherwise (including whenever no search location is active).

#### Scenario: School within 1km of the searched location
- **WHEN** a search location is active and a school's straight-line distance from it is less than 1km
- **THEN** that school's pin renders in the "within 1km" color

#### Scenario: School between 1km and 2km of the searched location
- **WHEN** a search location is active and a school's straight-line distance from it is between 1km and 2km
- **THEN** that school's pin renders in the "within 2km" color

#### Scenario: School beyond 2km of the searched location
- **WHEN** a search location is active and a school's straight-line distance from it is more than 2km
- **THEN** that school's pin renders in its default appearance, unchanged

#### Scenario: No search location active
- **WHEN** no search location is active
- **THEN** every school's pin renders in its default appearance
