## Context

The map view (`frontend/src/map/MapView.tsx`) holds the active search location in `useState`:

```
searchedLocation: GeocodeCandidate | null   // { label, latitude, longitude }
```

This one value drives the search marker, the `DistanceCircles` (1km/2km), the `DistanceLegend`, the distance-band pin colours (`getDistanceBand`), and, via `PanToSearch`, the viewport framing. `FitToSchools` independently fits the viewport to the full extent of schools once the schools list loads. `PanToSearch` and `FitToSchools` are both null-rendering children of `<MapContainer>` — the react-leaflet idiom for reaching `useMap()`, which only resolves for a component rendered inside the container's provider.

The app uses `HashRouter` (`react-router-dom` v7). Navigating map → `#/schools/<slug>` → back unmounts and remounts `MapView`, discarding `searchedLocation`; `FitToSchools` then re-runs and the user is back at the default Singapore-wide view. There is also no way to share a link to "the map centered on this address".

`react-router-dom` v7's `useSearchParams` operates on the location's query string, which under `HashRouter` is the query portion of the hash (`#/?q=...`). It is already a project dependency.

The schools list in `MapView` is fetched with a raw `fetch` + `useState` (not React Query), so a remount re-fetches it and the pins briefly disappear before reappearing. This is pre-existing and out of scope here.

## Goals / Non-Goals

**Goals:**

- The active search location survives map ↔ detail navigation, page refresh, and is shareable as a URL.
- Opening a shared/bookmarked URL restores the full search context (marker, circles, legend, pin colours, framed viewport) with no network geocoding call.
- Returning to the map from a detail page restores the exact prior map view.
- The detail page and its URL carry no map-query state.
- Malformed / hand-written search params degrade gracefully to the default map view.
- An explicit ✕ control clears the active search and its URL params.

**Non-Goals:**

- Persisting the raw map viewport (centre/zoom) in the URL. `useAutoViewport` re-derives an acceptable viewport from the search location; a manually panned/zoomed view is not preserved or shared. A future `@lat,lng,zoom` segment could add this.
- Re-geocoding from a `q`-only URL. A URL without usable coordinates is treated as no search.
- Converting the schools-list fetch to React Query (separate follow-up).
- Any backend / API change.
- A broad frontend test-suite retrofit. This change introduces the frontend test tooling (Vitest + React Testing Library) and covers the components it touches; pre-existing untested components are left as-is.

## Decisions

### Decision: URL hash query string is the single source of truth for the searched location

`MapView` derives `searchedLocation` from `useSearchParams()` (memoised on the raw `q`/`lat`/`lng` strings so the derived object is referentially stable between renders). The `useState` for `searchedLocation` is removed. `LocationSearch`'s `onSelect` is replaced by a URL write (`setSearchParams`), and the searched location "falls out" of the params on the next render.

**Why:** One source of truth eliminates the state/URL sync problem. Back/forward and manual edits work reactively for free. The alternative (keep `useState`, mirror to the URL with an effect) still loses state on remount unless the URL was carried through navigation — so the URL has to be authoritative anyway.

**Alternatives considered:**
- Lift `searchedLocation` to `App` / context — survives in-session navigation but not refresh, and is not shareable.
- `sessionStorage` / `localStorage` — survives refresh but not shareable; `localStorage` also causes cross-tab surprises and stale restores.

### Decision: URL shape is `#/?q=<label>&lat=<lat>&lng=<lng>` with all three params

`lat`/`lng` are the pin coordinates, rounded to 5 decimal places (~1 m). `q` is the human-readable label — used to seed the search input text and as the marker popup label. Restoring reads `lat`/`lng` directly; no `/api/geocode` request is issued.

**Why:** Immediate pin render on link-open, no latency or failure mode from a geocoding round trip, no dependency on the geocoder returning the same top result later.

**Alternatives considered:** `q`-only URL re-geocoded on load — rejected for the latency/failure/nondeterminism above.

### Decision: Strict parsing — both `lat` and `lng` must be finite numbers, else no search

The parse helper returns `null` unless `lat` and `lng` both parse as finite numbers. When it returns `null`, the search input is **not** seeded from `q` (a filled box with no pin is more confusing than an empty one). Malformed params are left in the URL as-is (we don't fight the user's URL) but treated as no active search.

**Why:** Matches the "hand-written `q` should be ignored" decision; keeps the restore path total and predictable.

### Decision: Consolidate viewport control into a `useAutoViewport` hook

`PanToSearch` and `FitToSchools` are replaced by a single hook, `useAutoViewport({ schools, searchedLocation })`, called from one null-rendering `<MapEffects>` child of `<MapContainer>`. The hook owns one effect with an explicit priority:

```ts
function useAutoViewport({ schools, searchedLocation }: …) {
  const map = useMap()
  const didFitSchools = useRef(false)
  useEffect(() => {
    if (searchedLocation) {
      map.fitBounds(searchRadiusBounds(searchedLocation))
      return
    }
    if (!didFitSchools.current && schools.length > 0) {
      map.fitBounds(schoolBounds(schools), { padding: [24, 24] })
      didFitSchools.current = true
    }
  }, [schools, searchedLocation, map])
}
```

**Why:** With two independent effects each calling `map.fitBounds`, the view on link-open depends on which of "schools fetch resolves" and "searchedLocation is read from the URL" wins — a race. One effect with one decision removes the race structurally rather than patching `FitToSchools` to bail. The "must be a child of `MapContainer`" boilerplate collapses from two components to one, and the branching logic becomes a plain hook that's unit-testable via `renderHook`.

**Behaviour of clearing a search:** the `didFitSchools` ref makes clear-search (or navigating back to a no-search URL) leave the viewport where it is, matching today's behaviour (`PanToSearch` no-ops when `location` is null; `FitToSchools` has already run). Dropping the ref would instead snap back to the all-schools view on clear — deliberately not chosen, as an unprompted viewport jump on ✕ is jarring.

**Alternatives considered:**
- Keep both components, add an early-return to `FitToSchools` when a search is active — smaller diff, but leaves two effects fighting over the viewport and keeps the coordination implicit.
- One-for-one `useFitToSchools` / `usePanToSearch` hooks — still two effects, still a race; no real gain over the components.

### Decision: Detail page keeps no query state; "← Back to map" is history-back with a fallback

The "More Details" `<Link to={`/schools/${slug}`}>` is unchanged — it does not append the search params, so the detail URL stays `#/schools/<slug>`. Context is preserved purely through browser history: the previous history entry retains the full `#/?q=...&lat=...&lng=...` URL.

"← Back to map" becomes: if there is in-app history to go back to (`window.history.state?.idx > 0`), call `navigate(-1)`; otherwise `navigate('/')`. Browser back behaves identically to the control.

**Why:** The user explicitly wants the detail page to show/carry nothing about the map query. History-back is a tiny change and restores the exact prior view. The fallback covers a direct/bookmarked visit to a detail page, where there is no map context to restore and the default map view is correct.

**Alternatives considered:** Threading the search params onto the detail URL and back — rejected: it puts map-query state on the detail page, which the user does not want.

### Decision: Explicit ✕ clear control in the search input

The ✕ renders inside the input whenever the input has text. Activating it: clears the input text, clears the candidate list / status, and removes `q`/`lat`/`lng` from the URL (deactivating marker, circles, legend, pin colours). Plain typing or backspacing to empty only edits the text and leaves the URL params untouched — the ✕ is the single deliberate "clear the search" action.

**Why:** Gives one unambiguous way to end a search. Decoupling text edits from param changes avoids a half-typed query wiping the active pin.

## Risks / Trade-offs

- **Referential instability of the derived `searchedLocation` re-fires `useAutoViewport`'s `fitBounds` on every render** → memoise the derived object on the raw param strings (`useMemo`), so its identity only changes when the params change.
- **`FitToSchools` / `PanToSearch` ordering race on link-open** → structurally removed by folding both into `useAutoViewport`'s single prioritised effect (see decision above).
- **`useAutoViewport` absorbs two components that other code or tests may import** → `PanToSearch.tsx` and `FitToSchools.tsx` are deleted; grep for imports (only `MapView.tsx` today) and update. The new hook and `<MapEffects>` host live in `frontend/src/map/`.
- **`LocationSearch` internal `query` state drifts from the URL on back/forward** (input text not re-synced when only the param changes) → acceptable for v1; a follow-up can `useEffect`-sync the text when the `q` param changes and differs. Marker/circles/legend always track the URL correctly.
- **Manually panned/zoomed views are neither preserved nor shareable** → documented non-goal; `useAutoViewport` still frames the search location sensibly.
- **Schools-list re-fetch flash on remount** → pre-existing; not caused or worsened by this change.
- **Coordinate rounding to 5 dp shifts the pin by up to ~1 m** → negligible for a distance-band tool that already labels itself an approximation.

### Decision: Introduce Vitest + React Testing Library for component tests

The frontend currently has no test runner. This change adds Vitest (shares Vite's config/transform pipeline), `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom`, with a `test` script and a `src/test/setup.ts`. Tests render components inside a `MemoryRouter` (with an `initialEntries` URL) so the URL-derived behaviour is exercised directly.

`react-leaflet` is mocked at the module boundary in tests: `MapContainer`, `TileLayer`, `Marker`, `Popup`, `Circle` render as plain elements, and `useMap` returns a stub whose `fitBounds`/`setView` are `vi.fn()`s that assertions can inspect. This keeps tests in jsdom (Leaflet needs a real layout engine) while still verifying which viewport calls fire. Because `useMap` is the mock, `useAutoViewport` can be exercised directly with `renderHook` — no Leaflet context provider needed in the wrapper.

**Why Vitest over Jest:** no separate Babel/ts-jest config, reuses `vite.config.ts`, near-zero setup for a Vite project.

**Alternatives considered:** Playwright component testing / full E2E — higher fidelity for the Leaflet viewport but much heavier to run in CI and overkill for verifying URL ↔ state wiring; can be added later for the map framing.

## Migration Plan

Pure frontend change, no data migration. Ship as a single deploy. Rollback is a straight revert — old URLs without params keep working (default map view), and any shared URLs with params simply stop restoring after a rollback (degrade to default view, no error).

## Open Questions

_None outstanding._ Viewport (centre/zoom) persistence and search-text re-sync on back/forward are deferred as explicit non-goals / follow-ups.
