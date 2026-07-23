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
The system SHALL show a school's name and address in a popup when its pin is hovered or clicked, and SHALL NOT show admission or balloting data in that popup.

#### Scenario: Hovering or clicking a pin
- **WHEN** a user hovers over or clicks a school's pin
- **THEN** a popup appears showing that school's name and address, with no admission or balloting data

### Requirement: Map is centered on Singapore by default
The system SHALL center and zoom the map by default to show the geographic extent of the geocoded schools.

#### Scenario: Initial map view
- **WHEN** the map view first loads
- **THEN** it is centered and zoomed to show the geographic extent of Singapore's schools by default
