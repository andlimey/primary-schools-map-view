## MODIFIED Requirements

### Requirement: Show basic identifying info on interaction
The system SHALL show a school's name and address in a popup when its pin is hovered or clicked. The popup SHALL also offer an expandable section showing that school's most-recent-year admission data, collapsed by default, and a "More Details" link to that school's dedicated detail page. WHEN a search location is active, the popup SHALL additionally offer an expandable "travel from the searched location" section, collapsed by default; WHEN no search location is active, that section SHALL NOT appear.

#### Scenario: Hovering or clicking a pin
- **WHEN** a user hovers over or clicks a school's pin
- **THEN** a popup appears showing that school's name and address, with an expandable "Show admissions" section available and collapsed by default, and a "More Details" link to that school's detail page

#### Scenario: Clicking a pin while a search location is active
- **WHEN** a user opens a school's popup while a search location is active
- **THEN** the popup additionally shows an expandable travel section, collapsed by default, alongside the admissions section and the "More Details" link

#### Scenario: Clicking a pin with no search location active
- **WHEN** a user opens a school's popup while no search location is active
- **THEN** the popup shows only the name, address, admissions section, and "More Details" link, with no travel section

## ADDED Requirements

### Requirement: Show travel distance and time from the searched location

WHEN a search location is active and the user expands a school popup's travel section, the system SHALL fetch and display, for each of walking, transit, and driving, the travel time between the searched location and that school, and — for walking and driving — the distance. The transit entry SHALL also show the number of transfers and the walking portion of the trip, and SHALL NOT show a total distance. The system SHALL fetch this data only when the section is first expanded — not when the popup opens and not when the map loads. Each mode's result SHALL load and fail independently: a mode whose route cannot be resolved SHALL show an inline "unavailable" indication for that row only, leaving the other rows and the rest of the section intact. The section SHALL state the reference time used for transit.

#### Scenario: Expanding the travel section
- **WHEN** a user expands a school popup's travel section for the first time
- **THEN** the system issues route requests for walking, transit, and driving, and renders one row per mode showing travel time, with distance shown for the walking and driving rows

#### Scenario: Travel section left collapsed
- **WHEN** a user opens a school's popup while a search location is active but does not expand the travel section
- **THEN** no route request is issued for that school

#### Scenario: One mode's route cannot be resolved
- **WHEN** the travel section is expanded and the route for one mode cannot be resolved
- **THEN** that mode's row shows an inline "route unavailable" indication while the other modes' rows render their results normally

#### Scenario: Transit trip detail
- **WHEN** the travel section is expanded and a transit route is resolved
- **THEN** the transit row shows the travel time, the number of transfers, and the walking portion of the trip, and shows no total distance

#### Scenario: Transit itinerary that is entirely walking
- **WHEN** the resolved transit itinerary involves no bus or rail travel
- **THEN** the transit row is presented as a walking trip (indicating no bus or train is needed) rather than as a transit itinerary

### Requirement: Draw a selected travel route on the map

WHEN a school popup's travel section is expanded, the system SHALL allow the user to select one mode to draw that route's path on the map, following the geometry returned by the router. At most one route SHALL be drawn at any time, across all schools. Selecting a mode SHALL close the school popup so the drawn route is not occluded by it, and SHALL show a dismissible summary chip fixed to a corner of the map viewport (not anchored to the pin) stating the mode, the destination school, and the route's time and distance. Selecting a different mode SHALL replace both the drawn route and the chip. Dismissing the chip SHALL remove the drawn route.

#### Scenario: Selecting a mode to draw
- **WHEN** a user selects a mode row in an expanded travel section
- **THEN** that route's path is drawn on the map following the router's geometry, the school popup closes, and a summary chip appears in a fixed corner of the map showing the mode, school name, and the route's time and distance

#### Scenario: Selecting a different mode after a route is drawn
- **WHEN** a route and its chip are shown and the user opens a school popup and selects a different mode
- **THEN** the previously drawn route is removed and the newly selected mode's route is drawn, and the chip updates to the new mode

#### Scenario: Dismissing the route chip
- **WHEN** a user activates the chip's dismiss control
- **THEN** the drawn route and the chip are both removed from the map

#### Scenario: Only one route at a time across the map
- **WHEN** a route is drawn for one school and the user draws a route for a different school
- **THEN** the first school's route is removed, so exactly one route is ever drawn

#### Scenario: Reopening and closing the popup does not affect the drawn route
- **WHEN** a route and chip are shown, and the user reopens that school's popup and closes it again without selecting a mode
- **THEN** the drawn route and chip remain; only the chip's dismiss control removes them

#### Scenario: Drawing a multi-stage transit route
- **WHEN** the user draws a transit route made up of walking and riding stages
- **THEN** the map shows the route as connected segments spanning every stage of the journey

### Requirement: Render the drawn route legibly and colour transit legs by service

The drawn route SHALL be rendered so it stays clearly visible over the map's base tiles — each leg drawn with a contrasting casing (outline) beneath its coloured line. Transit ride legs SHALL be coloured to correspond to the service used: MRT and LRT legs by their official rail-line colour, bus legs by a single bus colour. Walking SHALL be visually distinct from riding (a dotted line), applied both to a walking-only route and to the walking portions of a transit itinerary. A ride leg whose line cannot be identified SHALL fall back to a neutral colour rather than rendering without style.

#### Scenario: Route drawn over the base map
- **WHEN** any route is drawn
- **THEN** each leg is rendered with a casing beneath its line so it stays distinguishable from roads, water, and buildings on the base tiles

#### Scenario: Transit route with rail and bus legs
- **WHEN** a drawn transit route includes an MRT/LRT leg and a bus leg
- **THEN** the rail leg is drawn in that line's colour and the bus leg in the bus colour, with any walking portions drawn as a dotted line

#### Scenario: Unrecognised rail line
- **WHEN** a drawn transit route includes a ride leg whose line cannot be mapped to a known colour
- **THEN** that leg is drawn in a neutral fallback colour, still with a casing, rather than unstyled
