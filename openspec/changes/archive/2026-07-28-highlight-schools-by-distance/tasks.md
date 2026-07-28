## 1. Distance calculation

- [x] 1.1 Add a haversine distance helper (e.g. `frontend/src/map/distance.ts`) that takes two `{latitude, longitude}` points and returns meters
- [x] 1.2 Add a band-bucketing helper on top of it that returns `'within-1km' | 'within-2km' | null` given a distance in meters
- [x] 1.3 Add `WITHIN_1KM_METERS` / `WITHIN_2KM_METERS` constants to `frontend/src/map/constants.ts`

## 2. Pin coloring

- [x] 2.1 Add "within 1km" (green) and "within 2km" (amber) `L.divIcon` variants to `frontend/src/map/leaflet-icons.ts`, following the existing `searchMarkerIcon` pattern
- [x] 2.2 In `MapView.tsx`, derive each school's distance band from `schools` + `searchedLocation` via `useMemo`, recomputing only when either changes
- [x] 2.3 Pass each school's band down to `SchoolMarker`, and select the marker icon (band color vs. default) accordingly in `SchoolMarker.tsx`
- [x] 2.4 Verify pins revert to the default icon when `searchedLocation` is null and when a school falls outside 2km

## 3. Radius circles

- [x] 3.1 Add a `DistanceCircles` component (new file in `frontend/src/map/`) that renders two `L.circle`/`<Circle>` overlays centered on `searchedLocation`, at 1km and 2km radius, non-interactive (no popup/click handler)
- [x] 3.2 Render `DistanceCircles` from `MapView.tsx` only when `searchedLocation` is set
- [x] 3.3 Confirm the existing `PanToSearch` 3km-radius fit keeps both circles fully visible on typical viewport sizes; adjust `SEARCH_RADIUS_METERS` only if clipping is observed

## 4. Legend

- [x] 4.1 Add a `DistanceLegend` component (new file in `frontend/src/map/`) showing the "within 1km" / "within 2km" color swatches and a caveat referencing straight-line distance and a link to SchoolFinder (https://www.moe.gov.sg/schoolfinder/primary%20school)
- [x] 4.2 Position it near `LocationSearch` in `MapView.tsx`, rendered only when `searchedLocation` is set
- [x] 4.3 Style consistently with the existing shadcn/Tailwind components used elsewhere in `map/` (e.g. `Card`, existing popup styling)

## 5. Verification

- [x] 5.1 Manually test in the dev server: search an address, confirm nearby schools turn green/amber at the correct bands, circles render at the correct radii, legend appears/updates, and everything reverts to default on page load with no search
- [x] 5.2 Spot-check distance-band correctness for a couple of known addresses against SchoolFinder (https://www.moe.gov.sg/schoolfinder/primary%20school) to sanity-check the haversine calculation is in the right ballpark
- [x] 5.3 Run `pnpm lint` and `pnpm build` in `frontend/`
