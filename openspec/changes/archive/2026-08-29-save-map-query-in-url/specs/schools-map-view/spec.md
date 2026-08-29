## MODIFIED Requirements

### Requirement: Map is centered on Singapore by default

The system SHALL center and zoom the map by default to show the geographic extent of the geocoded schools, UNLESS the URL carries a valid searched location, in which case the initial view SHALL instead be framed on that searched location (as defined by the location-search capability) and the fit-to-all-schools framing SHALL NOT override it.

#### Scenario: Initial map view

- **WHEN** the map view first loads and the URL carries no valid searched location
- **THEN** it is centered and zoomed to show the geographic extent of Singapore's schools by default

#### Scenario: Initial map view with a searched location in the URL

- **WHEN** the map view loads with a URL that carries a valid searched location
- **THEN** the initial viewport is framed on that searched location, and the schools-list load does not subsequently re-fit the viewport to the full extent of schools
