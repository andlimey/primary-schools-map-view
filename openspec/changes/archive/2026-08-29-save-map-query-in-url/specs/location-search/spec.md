## ADDED Requirements

### Requirement: Persist the selected search location to the URL

The system SHALL record the active search location in the URL hash query string as `q` (the candidate's human-readable label), `lat`, and `lng` (its coordinates), so that the current map search is captured in a shareable, bookmarkable URL. Selecting a search candidate SHALL update these parameters; the searched location the map renders SHALL be derived from these parameters rather than from separate in-memory state.

#### Scenario: Selecting a candidate

- **WHEN** a user selects a candidate location from the search results
- **THEN** the URL's hash query string is updated to carry `q` set to that candidate's label, and `lat`/`lng` set to its coordinates

#### Scenario: Selecting a different candidate after an earlier search

- **WHEN** a user selects a different candidate while an earlier search's parameters are in the URL
- **THEN** the `q`, `lat`, and `lng` parameters are replaced with the newly selected candidate's label and coordinates

#### Scenario: Navigating back to a previous search

- **WHEN** a user triggers browser back/forward to a history entry whose URL carries a different (or absent) `q`/`lat`/`lng`
- **THEN** the map's searched location updates to match that URL without a page reload

### Requirement: Restore the searched location from the URL

The system SHALL, when the map view loads with a URL that carries a valid search location (`lat` and `lng` both present and parseable as finite numbers), restore the full search context from those parameters without issuing a geocoding request: a search marker at those coordinates, the 1km and 2km distance-band circles, the distance legend, distance-band pin colours for schools, and a viewport framed on that location. The search input SHALL be seeded with the `q` value.

#### Scenario: Loading a URL with a valid search location

- **WHEN** a user opens a map URL whose hash query string carries `q`, `lat`, and `lng` with `lat`/`lng` parseable as finite numbers
- **THEN** the map renders the search marker, the 1km and 2km circles, the legend, and distance-band pin colours for that location, frames the viewport on it, and populates the search input with `q`, all without calling the geocoding endpoint

#### Scenario: Loading a URL whose search location is missing or malformed coordinates

- **WHEN** a user opens a map URL that carries `q` but has a missing or non-numeric `lat` or `lng`
- **THEN** the system ignores the search parameters entirely: no marker, circles, or legend are shown, the search input is left empty, and the map shows its default view

### Requirement: Clear the active search

The system SHALL provide an explicit clear control (✕) within the search input, shown whenever the input contains text. Activating it SHALL clear the input text, dismiss any candidate list, and remove the `q`, `lat`, and `lng` parameters from the URL, thereby deactivating the search marker, circles, legend, and distance-band pin colours. Editing the input text by typing or deleting characters SHALL NOT by itself alter the URL's search parameters.

#### Scenario: Activating the clear control

- **WHEN** a user activates the clear (✕) control while a search location is active
- **THEN** the search input is emptied, the `q`/`lat`/`lng` parameters are removed from the URL, and the search marker, distance circles, legend, and distance-band pin colours are removed from the map

#### Scenario: Deleting the search text without using the clear control

- **WHEN** a user deletes the contents of the search input by backspacing rather than activating the clear control
- **THEN** the URL's `q`/`lat`/`lng` parameters are unchanged and the active search marker, circles, and legend remain on the map

#### Scenario: Clear control visibility

- **WHEN** the search input is empty
- **THEN** the clear (✕) control is not shown

#### Scenario: Viewport is not reset when the search is cleared

- **WHEN** a user activates the clear (✕) control while a search location is active
- **THEN** the map keeps its current center and zoom rather than snapping back to the full-extent-of-schools view
