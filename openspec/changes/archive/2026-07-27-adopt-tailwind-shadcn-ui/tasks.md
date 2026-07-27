## 1. Tooling setup

- [x] 1.1 Add `tailwindcss` and its Vite plugin to `frontend/package.json` (pnpm), wire it into `frontend/vite.config.ts`
- [x] 1.2 Initialize shadcn/ui in `frontend/` (`components.json`, `lib/utils.ts`, base CSS variables/tokens)
- [x] 1.3 Replace `frontend/src/index.css` with the Tailwind base/tokens setup; apply a global `font-sans` stack via `frontend/index.html` and/or `index.css`
- [x] 1.4 Add shadcn `Card`, `Table`, `Input`, and `Button` components to the repo
- [x] 1.5 Verify `pnpm dev` still builds and the app loads with Tailwind's base styles applied, no visual changes yet

## 2. Map overlay: LocationSearch

- [x] 2.1 Restyle `frontend/src/map/LocationSearch.tsx`'s input with the shadcn `Input` component, preserving existing props/handlers unchanged
- [x] 2.2 Restyle the results list/message/error states with Tailwind classes (replacing `.location-search-*` rules from `App.css`)
- [x] 2.3 Verify in the running app: typing, debounce, keyboard nav (up/down/enter/escape), and selecting a result all behave exactly as before, just restyled

## 3. SchoolMarker popup

- [x] 3.1 Add a `className` override on `<Popup>` in `frontend/src/map/SchoolMarker.tsx` to strip Leaflet's default `.leaflet-popup-content-wrapper` chrome (background/shadow/radius)
- [x] 3.2 Rebuild the popup content as a shadcn `Card` (school name, address, admissions toggle button, expandable admissions section, "More Details" link)
- [x] 3.3 Restyle `AdmissionsTable` (`frontend/src/map/AdmissionsTable.tsx`) using the shadcn `Table` primitive
- [x] 3.4 Restyle the search-result marker's popup content in `frontend/src/map/MapView.tsx` to match
- [x] 3.5 Verify in the running app: popup open/close, expand/collapse admissions, loading/no-data states, and "More Details" navigation all behave exactly as before

## 4. School detail page

- [x] 4.1 Restyle `frontend/src/school-detail/SchoolDetailPage.tsx`, replacing the bare `<dl>` with a Tailwind/shadcn layout (loading, not-found, and loaded states)
- [x] 4.2 Restyle `MultiYearAdmissionsTable` (`frontend/src/school-detail/MultiYearAdmissionsTable.tsx`) using the shadcn `Table` primitive, including its `no-data` cell state and balloting-detail sub-text
- [x] 4.3 Verify in the running app: loading state, not-found state, populated detail view, and multi-year table all render correctly

## 5. Cleanup

- [x] 5.1 Remove now-unused `frontend/src/App.css` and `frontend/src/school-detail/school-detail.css` (or any remaining unused rules within them)
- [x] 5.2 Run `pnpm lint` (oxlint) and `pnpm build` (tsc -b && vite build) and fix any resulting errors
- [x] 5.3 Do a full manual pass over the running app (map, search, popups, detail page) confirming no visual regressions or broken interactions remain
