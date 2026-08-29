# location-search Specification

## Purpose
Let a user search for an address or postal code and have the map pan/zoom to a guaranteed 3km-radius view of the resolved location, via a server-side geocoding proxy that keeps OneMap credentials off the client.

## Requirements
### Requirement: Search by address or postal code
The system SHALL provide a search input, overlaid on the map, that accepts free-text addresses and Singapore postal codes.

#### Scenario: Typing a query
- **WHEN** a user types into the search input
- **THEN** the system treats the input as a candidate address or postal code query, without requiring the user to indicate which it is

### Requirement: Present candidate matches for disambiguation
The system SHALL query candidate matches for the current input and present them as a selectable list, rather than automatically choosing one, whenever the query could plausibly resolve to more than one location.

#### Scenario: Query has multiple matches
- **WHEN** a search query resolves to more than one candidate location (e.g. a postal code shared by several buildings, or a place name matching multiple addresses)
- **THEN** the system shows the candidates in a list, each labeled with enough address detail to distinguish them, and takes no further action until the user selects one

#### Scenario: Query has no matches
- **WHEN** a search query resolves to no candidates
- **THEN** the system shows an indication that nothing was found, and the map view is unchanged

#### Scenario: Query is too short to search
- **WHEN** the input has fewer than a minimum number of characters
- **THEN** the system does not issue a search request

### Requirement: Pan and zoom to the selected location
The system SHALL pan the map to a selected search candidate's coordinates and set the zoom level so that a radius of at least 3 kilometers around that point is visible within the map viewport, regardless of the viewport's size or aspect ratio.

#### Scenario: Selecting a candidate
- **WHEN** a user selects a candidate location from the search results
- **THEN** the map pans so the selected location is at the center of the viewport, and the zoom level is set so that at least a 3km radius around it is visible

#### Scenario: Selecting a candidate on a narrow viewport
- **WHEN** a user selects a candidate location while viewing the map on a narrow or small viewport
- **THEN** the zoom level is still set so that at least a 3km radius around the selected location remains visible, without the map view being cropped tighter than that radius

### Requirement: Mark the searched location distinctly
The system SHALL display a marker at the selected search location that is visually distinguishable from school pins.

#### Scenario: After selecting a candidate
- **WHEN** a user selects a candidate location from the search results
- **THEN** a marker distinct in appearance from school pins appears at that location on the map

### Requirement: Geocoding proxy endpoint
The system SHALL expose an HTTP endpoint that accepts a free-text address or postal code query, resolves it against OneMap, and returns a list of candidate locations, each with a human-readable label and coordinates.

#### Scenario: Querying the endpoint
- **WHEN** a client requests the geocoding endpoint with a query string
- **THEN** the response includes a list of candidate locations, each with a label and a latitude/longitude, ordered as returned by the upstream geocoder

#### Scenario: Upstream geocoder returns nothing
- **WHEN** the upstream geocoder finds no matches for the query
- **THEN** the endpoint returns an empty list of candidates rather than an error

### Requirement: OneMap credentials stay server-side
The system SHALL NOT expose OneMap account credentials or authentication tokens to the client.

#### Scenario: Client inspects network traffic
- **WHEN** a client requests the geocoding endpoint
- **THEN** the response and request contain no OneMap credentials or authentication tokens; all OneMap authentication happens on the server

### Requirement: Reuse a cached OneMap token across requests
The system SHALL authenticate with OneMap by reusing a cached token across multiple geocoding requests, re-authenticating only when the cached token is rejected by OneMap.

#### Scenario: Consecutive geocoding requests
- **WHEN** the geocoding endpoint handles multiple requests while a previously fetched OneMap token is still valid
- **THEN** it reuses that token rather than authenticating with OneMap again

#### Scenario: Cached token is rejected
- **WHEN** OneMap rejects the cached token as invalid or expired
- **THEN** the system re-authenticates with OneMap to obtain a new token and retries the request

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
