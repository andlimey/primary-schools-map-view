## ADDED Requirements

### Requirement: Returning to the map restores the previous map view

The system SHALL provide a "← Back to map" control on the detail page that returns the user to the map. When the user reached the detail page from the map within the same session, this control (and browser back) SHALL restore the map view they left, including any active search location. When the detail page was opened directly (bookmark, shared link, refresh with no prior in-app history), the control SHALL navigate to the map's default view. The detail page's own URL SHALL NOT carry any map search or query state.

#### Scenario: Returning after arriving from the map with an active search

- **WHEN** a user navigated from the map to a school's detail page while a search location was active, then activates "← Back to map" (or browser back)
- **THEN** the map reopens with the same search location active — its marker, distance circles, legend, distance-band pin colours, and viewport framing restored

#### Scenario: Returning after arriving from the map with no active search

- **WHEN** a user navigated from the map to a detail page with no search active, then activates "← Back to map"
- **THEN** the map reopens showing its default view

#### Scenario: Returning from a directly opened detail page

- **WHEN** a user opened a detail page URL directly, with no prior in-app map history, then activates "← Back to map"
- **THEN** the map opens at its default view

#### Scenario: Detail page URL carries no map state

- **WHEN** a user is on a school's detail page, regardless of how they arrived
- **THEN** the detail page URL is of the form `/#/schools/<slug>` with no search/query parameters
