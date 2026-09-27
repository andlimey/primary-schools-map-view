# schools-map-api Specification

## Purpose
Serve geocoded school data and the built map frontend from a single HTTP origin, reading live from the database on every request.

## Requirements
### Requirement: List geocoded schools
The system SHALL expose an HTTP endpoint that returns, for every school that has been successfully geocoded, its id, slug, name, address, latitude, and longitude.

#### Scenario: Fetching all schools
- **WHEN** a client requests the schools list endpoint
- **THEN** the response includes id, slug, name, address, latitude, and longitude for every school that has a persisted coordinate

#### Scenario: Schools without coordinates are excluded
- **WHEN** a school has not been successfully geocoded (e.g. it is in the manual-review record with no persisted coordinate)
- **THEN** it is omitted from the schools list response rather than included with null coordinates

### Requirement: Serve live data without a rebuild step
The system SHALL read school data directly from the database on each request, without requiring a separate export or rebuild step to reflect updates. The database backing a running deployed instance is fixed for that instance's lifetime; picking up refreshed data requires deploying a new instance built with the updated database, not restarting or waiting on the existing one.

#### Scenario: Data changes during local development
- **WHEN** the underlying database file is updated by a scraper or geocoding batch run while a locally-run API process is pointed at that same file
- **THEN** subsequent requests to the schools list endpoint reflect the updated data without the API process being restarted

#### Scenario: Data changes require a new deployment in production
- **WHEN** school or admissions data needs to change for a deployed instance
- **THEN** the updated database must be included in a newly built and deployed image; the already-running instance does not pick up the change on its own

### Requirement: Serve the frontend application
The system SHALL serve the built map frontend's static assets from the same origin as the API.

#### Scenario: Requesting the app
- **WHEN** a client requests the site's root path
- **THEN** the backend serves the built frontend application's static assets, so the map and its API are reachable from a single origin

### Requirement: Serve all schools' most-recent-year admission data in one response
The system SHALL expose an HTTP endpoint that returns, in a single response, every school's admission phase data for the most recent year present across the dataset (a single global year, not computed per school), including for each phase its label, vacancy count, applied count, taken count, and, for phases where balloting occurred, the balloting category code, category label, applicants, and vacancies.

#### Scenario: Fetching admissions data for all schools
- **WHEN** a client requests the admissions endpoint
- **THEN** the response includes the resolved most-recent year and, for every school that has admission phase records for that year, its phases with vacancy, applied, and taken counts, plus balloting detail for any phase where balloting occurred

#### Scenario: Schools with no data in the most recent year are excluded
- **WHEN** a school has no admission phase records for the most recent year present in the dataset (whether never matched to admission data, or its latest available year is older)
- **THEN** that school is omitted from the admissions response rather than included with null or empty phase data

#### Scenario: Most recent year is computed globally
- **WHEN** the most recent year present in the dataset changes (e.g. a new year is scraped and the resulting database is deployed)
- **THEN** subsequent requests to the admissions endpoint resolve "most recent year" against the new global maximum, applied uniformly to every school in the response, with no per-school special-casing and no code change — though for a deployed instance, seeing the new dataset at all requires that new deployment to have happened

### Requirement: Serve a single school's detail fields
The system SHALL expose an HTTP endpoint that returns, for a single school identified by id, its name, address, url_address, zone_code, nature_code, and mainlevel_code.

#### Scenario: Fetching an existing school's detail
- **WHEN** a client requests the school detail endpoint for a school id that exists
- **THEN** the response includes that school's name, address, url_address, zone_code, nature_code, and mainlevel_code

#### Scenario: Fetching a nonexistent school's detail
- **WHEN** a client requests the school detail endpoint for a school id that does not exist
- **THEN** the response indicates the school was not found rather than returning empty or null fields

### Requirement: Serve a single school's full admission history
The system SHALL expose an HTTP endpoint that returns, for a single school identified by id, its admission phase data for every year present in the dataset, including for each phase and year its label, vacancy count, applied count, taken count, and, for phases where balloting occurred, the balloting category code, category label, applicants, and vacancies.

#### Scenario: Fetching admissions history for a school with multi-year data
- **WHEN** a client requests the admissions history endpoint for a school that has admission phase records across multiple years
- **THEN** the response includes, for every year that school has records for, its phases with vacancy, applied, and taken counts, plus balloting detail for any phase where balloting occurred

#### Scenario: Fetching admissions history for a school with no data
- **WHEN** a client requests the admissions history endpoint for a school that has no admission phase records for any year
- **THEN** the response indicates no admission history is available rather than an error

#### Scenario: Fetching admissions history for a nonexistent school
- **WHEN** a client requests the admissions history endpoint for a school id that does not exist
- **THEN** the response indicates the school was not found

### Requirement: Route proxy endpoint
The system SHALL expose an HTTP endpoint that accepts an origin coordinate, a destination coordinate, and a travel mode of walking, transit, or driving, resolves the route against OneMap's routing service, and returns:

- the total travel duration;
- the total distance, for walking and driving only (omitted for transit);
- the route geometry as an ordered list of legs, each carrying its own ordered list of coordinates and its own sub-mode (e.g. walking, bus, rail);
- for transit only: the number of transfers and the duration of the walking portion of the trip, and a flag indicating whether the itinerary consists solely of walking.

When no route can be resolved for the requested mode, the endpoint SHALL return a well-formed "no route found" result rather than an HTTP error.

#### Scenario: Walking or driving route
- **WHEN** a client requests the route endpoint with `mode=walk` or `mode=drive` and valid origin and destination coordinates
- **THEN** the response contains the travel duration, the total distance, and a single leg whose coordinate list traces the path returned by the router

#### Scenario: Transit route
- **WHEN** a client requests the route endpoint with `mode=transit` and valid origin and destination coordinates that have a transit itinerary
- **THEN** the response contains the travel duration, the transfer count, the walking-portion duration, no total distance, and one leg per stage of the journey (each walking or riding stage as its own leg with its own coordinate list and sub-mode)

#### Scenario: Transit itinerary that is entirely walking
- **WHEN** a `mode=transit` request resolves to an itinerary with no riding stages
- **THEN** the response contains a single walking leg and a flag marking the itinerary as walk-only

#### Scenario: No route available
- **WHEN** the router cannot produce a route for the requested mode between the two coordinates
- **THEN** the endpoint returns a "no route found" result with a success status, not an error status

### Requirement: Transit routing uses a fixed weekly school-run time
The system SHALL request transit routes from OneMap for a canonical reference time — 06:30 on the upcoming Monday in the Asia/Singapore time zone — rather than the current wall-clock time, so that transit results are stable, comparable between schools, and cacheable. Walking and driving route requests SHALL NOT depend on the time of day.

#### Scenario: Two transit requests on different days of the same week
- **WHEN** the same origin, destination, and `mode=transit` are requested on two different days that fall in the same week
- **THEN** both requests use the same Monday-06:30 reference time and, absent a cache eviction, yield the same route

#### Scenario: Walking and driving are time-independent
- **WHEN** a walking or driving route is requested
- **THEN** the request to the router carries no time-of-day parameter and the result does not vary with the time the request is made

### Requirement: Cache resolved routes in memory
The system SHALL cache resolved routes in process memory, keyed by the rounded origin coordinate, the rounded destination coordinate, the travel mode, and the canonical weekly reference time. While a cache entry is live, the system SHALL serve it without calling OneMap again. Entries SHALL expire after seven days. The cache SHALL be bounded in size and SHALL evict least-recently-used entries when full.

#### Scenario: Repeated identical request within the retention window
- **WHEN** the same origin, destination, and mode are requested a second time while the cached entry is still live
- **THEN** the response is served from the in-memory cache with no new OneMap routing call

#### Scenario: Weekly reference time advances
- **WHEN** a route is requested after the canonical Monday reference has rolled forward to the next week
- **THEN** the earlier week's cache entry is not reused and the route is resolved afresh against OneMap

#### Scenario: Cache is at capacity
- **WHEN** a new route must be cached and the cache is already at its maximum size
- **THEN** the least-recently-used entry is evicted to make room

#### Scenario: Process restart
- **WHEN** the API process restarts (including waking from a scaled-to-zero state)
- **THEN** the route cache starts empty and the next request for any route resolves it against OneMap

### Requirement: Reuse the cached OneMap token for routing
The system SHALL authenticate routing requests to OneMap using the same cached-token mechanism as geocoding: a token is fetched lazily, reused across requests, and re-fetched exactly once when OneMap rejects it. OneMap account credentials and authentication tokens SHALL NOT be exposed to the client in any routing request or response.

#### Scenario: Routing request while the token is valid
- **WHEN** the route endpoint handles a request while a previously fetched OneMap token is still valid
- **THEN** it reuses that token rather than authenticating with OneMap again

#### Scenario: Cached token is rejected during routing
- **WHEN** OneMap rejects the cached token while resolving a route
- **THEN** the system re-authenticates once to obtain a new token and retries the routing request

#### Scenario: Client inspects routing traffic
- **WHEN** a client requests the route endpoint
- **THEN** the request and response contain no OneMap credentials or tokens; all OneMap authentication happens on the server
