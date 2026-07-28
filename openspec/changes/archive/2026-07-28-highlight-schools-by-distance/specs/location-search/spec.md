## ADDED Requirements

### Requirement: Draw distance-band circles around the searched location
The system SHALL draw two circle overlays centered on a selected search location, at 1km and 2km radius, for as long as that search location remains active.

#### Scenario: Selecting a candidate
- **WHEN** a user selects a candidate location from the search results
- **THEN** two circles appear centered on that location, at 1km and 2km radius

#### Scenario: Selecting a new candidate after an earlier search
- **WHEN** a user selects a different candidate location while circles from an earlier search are shown
- **THEN** the circles move to be centered on the newly selected location

### Requirement: Show a distance legend while a search result is active
The system SHALL show a legend, positioned near the search input, only while a search location is active. The legend SHALL identify the "within 1km" and "within 2km" pin colors, and SHALL state that the distance is a straight-line approximation that may not match MOE's own calculation method, with a link to SchoolFinder (https://www.moe.gov.sg/schoolfinder/primary%20school) for verification.

#### Scenario: Selecting a candidate
- **WHEN** a user selects a candidate location from the search results
- **THEN** a legend appears near the search input showing the "within 1km" and "within 2km" color key and a caveat, with a link to SchoolFinder, stating the distance is an approximation that may not match MOE's calculation

#### Scenario: No search location active
- **WHEN** no search location has been selected yet
- **THEN** the legend is not shown
