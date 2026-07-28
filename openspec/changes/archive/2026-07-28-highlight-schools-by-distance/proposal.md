## Why

MOE uses Home-School Distance (HSD) — home address vs. school, bucketed into <1km, 1-2km, and >2km — as a priority-admission factor in every phase where a school is oversubscribed (see https://www.moe.gov.sg/primary/p1-registration/distance and https://www.moe.gov.sg/primary/p1-registration/registration-phases-key-dates?pt=1), combined with citizenship status. It's not specific to any one phase — it's a standing factor across the whole registration process. A parent searching their address today gets school pins and a 3km-radius pan/zoom, but has no visual way to tell which schools fall inside those distance bands without manually eyeballing distances. Color-coding schools by distance band and drawing the band boundaries as circles turns the map into a direct answer to "which schools am I in a priority band for."

## What Changes

- Compute straight-line (haversine) distance from the searched location to every school, client-side, using coordinates already loaded in the frontend — no backend changes.
- Color school pins by distance band when a search location is active: green for <1km, amber for 1-2km, existing default marker for >2km (no dimming).
- Draw two circle overlays centered on the searched location, at 1km and 2km radius.
- Show a legend near the search box, visible only while a search result is active, with the two color swatches and a caveat that distance is straight-line and may not match MOE's own calculation method, linking to SchoolFinder (https://www.moe.gov.sg/schoolfinder/primary%20school) to verify.
- Stay on the current Leaflet/react-leaflet stack; do not introduce Mapbox GL/MapLibre GL (circles and per-marker color variants are natively supported by Leaflet, and the school count (~180) doesn't warrant WebGL rendering).

Explicitly out of scope: no cross-referencing distance bands against the existing admissions balloting categories (SC<1/SC1-2) shown in school popups — those categories depend on applicant type, not just distance, so a searched address isn't a reliable proxy for them.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `schools-map-view`: school pins are color-coded by distance band (green <1km, amber 1-2km, default beyond) whenever a search location is active, reverting to the default marker for all schools when no search is active.
- `location-search`: selecting a search candidate now also draws two circle overlays (1km, 2km radius) around it and shows a legend (color key + distance-caveat with a SchoolFinder link) for as long as that search result remains active.

## Impact

- Affected code: `frontend/src/map/MapView.tsx`, `SchoolMarker.tsx`, `leaflet-icons.ts`, `LocationSearch.tsx`, `PanToSearch.tsx`, `constants.ts`, `types.ts`.
- No backend/API changes.
- No new dependencies (Leaflet already supports `L.circle` and custom `divIcon`s).
