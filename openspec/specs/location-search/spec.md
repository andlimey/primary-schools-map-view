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
