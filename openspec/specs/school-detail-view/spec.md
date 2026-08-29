# school-detail-view Specification

## Purpose
Provide a dedicated per-school page showing that school's core information and its full multi-year admission/balloting history, reached from the map popup.

## Requirements
### Requirement: Navigate to a school's detail page from its popup
The system SHALL provide a "More Details" link in each school's map popup that navigates to that school's dedicated detail page, addressed by a hash-based route keyed on the school's slug.

#### Scenario: Clicking More Details
- **WHEN** a user clicks the "More Details" link in a school's popup
- **THEN** the browser navigates to that school's detail page at a URL of the form `/#/schools/<slug>`

### Requirement: Detail page shows core school information
The system SHALL, on a school's detail page, display that school's name, address, url_address, zone_code, nature_code, and mainlevel_code.

#### Scenario: Loading a school's detail page
- **WHEN** a user navigates to a valid school's detail page
- **THEN** the page displays that school's name, address, url_address, zone_code, nature_code, and mainlevel_code

### Requirement: Detail page shows all past ballot data in one table
The system SHALL, on a school's detail page, display a single table of that school's admission phase data across every year present in the data, with phases as rows and years as columns, including balloting category, applicants, and vacancies for any phase/year where balloting occurred.

#### Scenario: Loading the detail page for a school with multi-year data
- **WHEN** a user navigates to the detail page for a school that has admission phase records for more than one year
- **THEN** the page shows one table with a row per phase and a column per year, populated with that phase/year's vacancy, applied, and taken counts, and balloting category/applicants/vacancies where balloting occurred for that phase/year

#### Scenario: Loading the detail page for a school with no ballot data
- **WHEN** a user navigates to the detail page for a school that has no admission phase records for any year
- **THEN** the page shows an explicit "No admission data" indication instead of an empty table

### Requirement: Direct navigation to a detail page works without prior map interaction
The system SHALL render a school's detail page correctly when its URL is loaded directly (e.g. via bookmark, shared link, or page refresh), without requiring the user to have first interacted with that school's map popup.

#### Scenario: Loading a detail page URL directly
- **WHEN** a user opens a school's detail page URL directly, without having previously opened that school's popup on the map
- **THEN** the page fetches and displays that school's information and admission history itself, rather than depending on data already being cached from a popup interaction

#### Scenario: Refreshing a detail page
- **WHEN** a user refreshes the browser on a school's detail page
- **THEN** the page reloads and renders the same school's information and admission history correctly

### Requirement: Unknown school slug shows a not-found state
The system SHALL show an explicit "school not found" state on the detail page when the URL's slug does not match any known school.

#### Scenario: Navigating to a nonexistent school slug
- **WHEN** a user navigates to a detail page URL whose slug does not match any school
- **THEN** the page shows a "school not found" state instead of an empty or broken page

### Requirement: Detail page shows an oversubscription trend chart per phase
The system SHALL, on a school's detail page, display a line chart above the admissions table showing each admission phase's oversubscription ratio (applied ÷ vacancy) across the years of available data, with a reference line marking the 100% (applied = vacancy) threshold.

#### Scenario: Loading the detail page for a school with multi-year data
- **WHEN** a user navigates to the detail page for a school that has admission phase records for more than one year
- **THEN** the page shows a chart with one line per phase, plotting that phase's applied ÷ vacancy ratio by year in chronological (oldest to newest) order, with a reference line at the 100% threshold

#### Scenario: A phase/year has no usable vacancy data
- **WHEN** a phase has no entry for a given year, or its `vacancy` value is null or zero for that year
- **THEN** that phase's line has a gap at that year rather than a plotted zero or an interpolated value

#### Scenario: Loading the detail page for a school with no ballot data
- **WHEN** a user navigates to the detail page for a school that has no admission phase records for any year
- **THEN** the page does not show the trend chart, consistent with the existing "No admission data" indication

### Requirement: Trend chart phases can be filtered independently of the table
The system SHALL provide phase-toggle filter chips above the trend chart, one per phase shown in the chart, that show or hide that phase's line when toggled, without affecting which phases or years are displayed in the admissions table.

#### Scenario: Toggling a phase chip off
- **WHEN** a user toggles off a phase's filter chip
- **THEN** that phase's line is hidden from the chart, and the admissions table below continues to show that phase's column unchanged

#### Scenario: All chips are on by default
- **WHEN** a user loads the detail page
- **THEN** every phase present in the chart has its filter chip on by default, so all phase lines are initially visible

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
