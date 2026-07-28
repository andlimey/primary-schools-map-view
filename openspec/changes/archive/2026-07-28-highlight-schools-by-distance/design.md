## Context

The map (`frontend/src/map/`) is built on `react-leaflet` v5 + Leaflet + raw OpenStreetMap tiles, rendering ~180 Singapore primary schools as pins. `LocationSearch.tsx` already resolves a searched address/postal code to a `GeocodeCandidate` (lat/lng), which `MapView.tsx` holds in state and `PanToSearch.tsx` uses to fit the viewport to a 3km-radius box. `SchoolMarker.tsx` renders every school with Leaflet's default pin icon; `leaflet-icons.ts` already defines one custom `divIcon` (the search-result marker), establishing the pattern for adding more.

MOE's Home-School Distance (HSD) priority admission bands are officially bounded at 1km and 2km from home to school, and apply across registration phases generally (combined with citizenship status), not to a single phase. This change surfaces those same bands directly on the map once a user has searched their address.

## Goals / Non-Goals

**Goals:**
- Color-code school pins by straight-line distance band (< 1km, 1-2km) from a searched location.
- Draw 1km/2km radius circles around the searched location.
- Make it unambiguous to the user that this is an approximation, not MOE's authoritative determination.
- Ship this as a frontend-only change on the existing Leaflet stack.

**Non-Goals:**
- Matching MOE's exact (undisclosed) distance calculation method.
- Cross-referencing distance bands against admissions balloting categories (`SC<1`/`SC1-2`) — those depend on applicant type, not just distance, so a searched address isn't a reliable proxy for them.
- Any backend/API change — all inputs (school coordinates, searched location) are already available client-side.
- Migrating off Leaflet to Mapbox GL / MapLibre GL.

## Decisions

### Stay on Leaflet; do not introduce MapGL
Circles at an exact meter radius (`L.circle`) and per-marker color variants (`divIcon`, already used for the search pin) are both native Leaflet capabilities. MapGL (Mapbox GL / MapLibre) earns its complexity at marker counts in the thousands or when vector-tile/3D styling is needed — neither applies at ~180 schools with two flat color bands. Introducing it here would mean rewriting `MapView`, `FitToSchools`, `PanToSearch`, `SchoolMarker`, and the tile/icon setup for no functional gain on this feature.

**Alternatives considered:** Mapbox GL JS (rejected: requires an API key and usage billing, and the feature doesn't need WebGL); MapLibre GL (rejected: still a full stack swap for zero incremental capability this change needs).

### Compute distance client-side with the haversine formula
Both operands (`school.latitude/longitude`, `searchedLocation.latitude/longitude`) are already loaded in `MapView.tsx` state. A `useMemo` deriving each school's distance and band from `schools` + `searchedLocation` avoids any new network round-trip and keeps the computation colocated with the data it depends on.

**Alternatives considered:** Server-side distance endpoint (rejected: adds a request and API surface for a computation that needs no data the client doesn't already have); PostGIS/geodesic libraries (rejected: haversine is accurate enough at this scale — Singapore's flatness makes the ellipsoidal correction negligible — and needs no new dependency).

### Band → color mapping, no dimming
`< 1km` → green, `1km – 2km` → amber, `> 2km` (or no active search) → the existing default Leaflet marker, unchanged. Out-of-band schools are deliberately left at full visual weight rather than dimmed, so the change only *adds* information (two new color states) without altering how the rest of the map reads today.

### Legend lifecycle tied to search state
The legend (color key + SchoolFinder caveat) is a sibling overlay to `LocationSearch`, rendered near it, and is mounted only while `searchedLocation` is non-null — appearing the instant colored pins can appear, disappearing when the search is cleared. This avoids a second, separate "persistent disclaimer" element competing for attention: the legend itself is the persistent note for the duration it's relevant.

### Circles as non-interactive overlays
Two `L.circle` instances centered on `searchedLocation`, radius 1000m and 2000m, added/removed alongside the search marker (same lifecycle as `PanToSearch`/the existing search `Marker`). No popups or click handlers on the circles themselves — they're a visual reference, not an interactive element.

## Risks / Trade-offs

- **[Risk]** Haversine distance may disagree with MOE's actual (undisclosed) method, potentially by enough to flip a school's perceived band → **Mitigation:** legend caveat with a direct SchoolFinder link is shown for the entire duration bands are visible, not just on first search.
- **[Risk]** Three visual states (green/amber/default) plus two circles plus the existing search marker could read as cluttered on a small viewport → **Mitigation:** none of this is new chrome when no search is active (current default-marker view is unchanged); clutter only appears in the state where the user has just asked for exactly this information.
- **[Risk]** `PanToSearch`'s current fit is a fixed 3km box; at some viewport aspect ratios the 2km circle could be clipped → **Mitigation:** existing `SEARCH_RADIUS_METERS` (3000m) already gives headroom beyond the 2km circle; no change needed there, but worth a manual check during implementation.

## Migration Plan

Frontend-only, additive change behind no flag — ships in the next frontend deploy. No data migration. Rollback is a plain revert (no persisted state or schema involved).

## Open Questions

- Exact hex/oklch values for the green/amber pin variants (should read clearly against the existing default red/blue Leaflet pin and the app's shadcn theme) — left to implementation, not a blocking decision.
- Whether the two new marker icons reuse the existing pin silhouette (recolored) or the simpler dot style used for the search marker — implementation-level choice, doesn't affect requirements.
