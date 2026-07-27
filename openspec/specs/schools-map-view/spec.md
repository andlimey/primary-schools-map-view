# schools-map-view Specification

## Purpose
Render geocoded schools as pins on an interactive map so users can visually explore school locations.

## Requirements
### Requirement: Display all geocoded schools as map pins
The system SHALL render one pin per geocoded school, positioned at that school's coordinates.

#### Scenario: Loading the map
- **WHEN** the map view loads
- **THEN** it fetches the schools list from the API and renders one pin per returned school at its geocoded coordinates

### Requirement: Use OpenStreetMap tiles
The system SHALL render the map's base layer using OpenStreetMap tile imagery, requiring no API key.

#### Scenario: Rendering the base map
- **WHEN** the map view renders
- **THEN** it displays OpenStreetMap tile imagery as the base layer without requiring an API key

### Requirement: Show basic identifying info on interaction
The system SHALL show a school's name and address in a popup when its pin is hovered or clicked. The popup SHALL also offer an expandable section showing that school's most-recent-year admission data, collapsed by default, and a "More Details" link to that school's dedicated detail page.

#### Scenario: Hovering or clicking a pin
- **WHEN** a user hovers over or clicks a school's pin
- **THEN** a popup appears showing that school's name and address, with an expandable "Show admissions" section available and collapsed by default, and a "More Details" link to that school's detail page

### Requirement: Map is centered on Singapore by default
The system SHALL center and zoom the map by default to show the geographic extent of the geocoded schools.

#### Scenario: Initial map view
- **WHEN** the map view first loads
- **THEN** it is centered and zoomed to show the geographic extent of Singapore's schools by default

### Requirement: Show most-recent-year admission data on request
The system SHALL, when a user expands a school's admissions section, display which year the data pertains to, and that school's most recent year of admission phase data: for each phase, its label, vacancy count, applied count, and taken count, and where balloting occurred for a phase, the balloting category, applicants, and vacancies for that category.

#### Scenario: Expanding a school with admission data
- **WHEN** a user expands the admissions section for a school that has admission phase data for the most recent year
- **THEN** the section shows the year the data is for, followed by a table of that year's phases with vacancy, applied, and taken counts, and balloting category/applicants/vacancies for any phase where balloting occurred

### Requirement: Load all schools' admission data once
The system SHALL fetch admission data for all schools in a single request when the map loads, rather than issuing a separate fetch each time an individual school's popup or admissions section is opened.

#### Scenario: Loading the map
- **WHEN** the map view loads
- **THEN** the system fetches admission data for all schools once, independent of which (if any) popups a user subsequently opens

#### Scenario: Expanding a popup's admissions section after data has loaded
- **WHEN** a user expands a school's admissions section after the initial admissions fetch has completed
- **THEN** the section renders from the already-loaded data without issuing a new network request

#### Scenario: Expanding a popup's admissions section before data has loaded
- **WHEN** a user expands a school's admissions section while the initial admissions fetch is still in progress
- **THEN** the section shows a loading state until the fetch completes, then renders that school's data (or the "no admission data" state)

### Requirement: Indicate absence of admission data for the most recent year
The system SHALL show an explicit "no admission data" indication in a school's expandable admissions section when that school has no admission phase records for the most recent year present in the data, rather than showing an empty or misleading table.

#### Scenario: Expanding a school with no data for the most recent year
- **WHEN** a user expands the admissions section for a school that has no admission phase records for the most recent year (whether the school has never been matched to admission data, or its most recent available year predates the current most-recent year)
- **THEN** the section shows an explicit "No admission data" message instead of a table

### Requirement: Prefetch detail page data on pin interaction
The system SHALL begin fetching a school's detail-page data (its detail fields and full admission history) as soon as that school's popup is opened, rather than waiting until the "More Details" link is clicked.

#### Scenario: Opening a school's popup
- **WHEN** a user hovers over or clicks a school's pin, opening its popup
- **THEN** the system begins fetching that school's detail fields and full admission history in the background, independent of whether the user subsequently clicks "More Details"

#### Scenario: Clicking More Details after the popup has been open
- **WHEN** a user clicks "More Details" after that school's popup has already triggered the prefetch and the prefetch has completed
- **THEN** the detail page renders from the already-fetched data without issuing new requests for it
