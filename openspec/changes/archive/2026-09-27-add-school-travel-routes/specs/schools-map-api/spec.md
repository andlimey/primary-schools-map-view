## ADDED Requirements

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
