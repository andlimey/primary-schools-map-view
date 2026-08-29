## Why

When a user searches an address on the map, then opens a school's detail page and comes back, the map resets to the default Singapore-wide view — the searched pin, distance circles, distance-band pin colors, and legend are all lost, because that state lives only in `MapView`'s component state and is discarded on unmount. The user also has no way to share "the map, centered on this address" with someone else.

## What Changes

- The active search location is encoded in the URL hash query string (`#/?q=<label>&lat=<lat>&lng=<lng>`) and becomes the single source of truth for the searched location on the map.
- Opening a URL that carries a valid `lat`/`lng` restores the full search context on load: the search marker, the 1km/2km circles, the distance-band pin colors, the legend, and a viewport framed on that location — with no geocoding request.
- Selecting a search candidate updates the URL instead of only setting local state; browser back/forward and manual URL edits drive the searched location reactively.
- Returning to the map from a school detail page (via the "← Back to map" control or browser back) restores the exact map view the user left, including any active search. The detail page and its URL carry no map-query state.
- A search parameter with a missing or non-numeric `lat`/`lng` is ignored entirely (no pin, empty search box) — hand-written or malformed URLs degrade to the default map view.
- The search input gains an explicit "clear" (✕) control that removes the search text and strips the search parameters from the URL, deactivating the pin, circles, and legend. Plain typing/backspacing only edits the text and does not alter the URL parameters.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `location-search`: the selected search location is persisted to and restored from the URL; selecting a candidate updates the URL; an explicit clear control removes the active search and its URL parameters.
- `schools-map-view`: the initial map view honors a searched location supplied in the URL (framing that location and rendering its marker, circles, and distance-band pin colors on load) instead of always fitting to the full extent of schools.
- `school-detail-view`: returning to the map restores the previous map view rather than resetting it; the detail page carries no search/query state.

## Impact

- Frontend only. No API or backend changes; notably, restoring from the URL performs no `/api/geocode` call.
- `frontend/src/map/MapView.tsx` — derive the searched location from the URL instead of `useState`.
- `frontend/src/map/LocationSearch.tsx` — write the URL on candidate selection; seed the input from the URL; add the ✕ clear control.
- `frontend/src/map/FitToSchools.tsx` + `PanToSearch.tsx` — replaced by a single `useAutoViewport` hook (in a null-rendering `<MapEffects>` child) that frames a searched location when present and otherwise fits to all schools once, removing the race between the two current viewport effects.
- `frontend/src/school-detail/SchoolDetailPage.tsx` — "← Back to map" uses history-back with a fallback to the default map view for direct visits.
- Depends on `react-router-dom` v7's `useSearchParams` (already a dependency), which operates on the hash query string under `HashRouter`.
