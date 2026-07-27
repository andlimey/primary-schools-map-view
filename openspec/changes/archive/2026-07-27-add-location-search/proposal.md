## Why

There is currently no way to jump the map to a specific place. A user has to manually pan/zoom across all of Singapore to check which schools are near their home or a prospective address. A location search closes that gap: type an address or postal code, and see the schools within practical distance of it — directly useful for P1 registration distance-based priority, which is the whole reason this map exists.

## What Changes

- Add a search input overlaid on the map that accepts a free-text address or a postal code.
- As the user types (debounced), show a dropdown of candidate matches so ambiguous queries (a shared postal code, a common place name) can be resolved by the user rather than guessed at.
- Selecting a candidate pans the map to that location and sets the zoom so that at least a 3km radius around it is visible, regardless of screen size.
- Drop a distinct marker (visually different from school pins) at the selected location, so the search result has a visible anchor on the map.
- Add a new backend endpoint, `GET /api/geocode`, that proxies search queries to OneMap's search API and returns a list of candidate `{label, latitude, longitude}` results.
- The backend owns OneMap's auth token lifecycle: fetch lazily, cache in memory, refresh only on an auth failure — never re-authenticate per request, and never expose OneMap credentials or the token to the client.

## Capabilities

### New Capabilities
- `location-search`: address/postal-code search that resolves ambiguous candidates via a user-picked dropdown, then pans and zooms the map to guarantee a 3km-radius view of the chosen location. Backed by a server-side geocoding proxy so OneMap credentials/tokens never reach the browser.

### Modified Capabilities
(none — this adds a new capability without changing the requirements of `schools-map-view` or `schools-map-api`)

## Impact

- `frontend/src/App.tsx`: new search input component, a `PanToSearch` map-effect component (alongside the existing `FitToSchools`), and a distinct marker for the searched location.
- `src/schoolsmap/api.py`: new `GET /api/geocode` route.
- New module for OneMap token caching (in-memory, lazy-fetch, refresh-on-401), reusing `src/p1data/onemap.py`'s existing `search()` function rather than duplicating OneMap request logic.
- No database schema changes. No changes to the existing `geocode-schools` batch job or its disambiguation logic (that logic is school-name-aware and doesn't apply to free-form user queries).
