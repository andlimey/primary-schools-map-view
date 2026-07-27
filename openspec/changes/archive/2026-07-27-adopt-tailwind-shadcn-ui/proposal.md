## Why

The frontend currently has no CSS framework or component library — hand-rolled CSS with raw hex colors, no design tokens, no loaded font, and no dark mode despite `color-scheme: light dark` being declared. The result reads as unstyled/default HTML rather than a polished public-facing tool. Adopting Tailwind CSS + shadcn/ui gives the app a coherent, modern visual system without the bundle weight or "enterprise dashboard" feel of MUI or Ant Design, which don't fit a small, map-first public utility.

## What Changes

- Add Tailwind CSS to the Vite build and apply it as the global styling approach, replacing the existing hand-written `App.css` / `index.css` / `school-detail.css`.
- Add shadcn/ui, using its `Card`, `Table`, `Input`, and `Button` primitives where they fit the existing components.
- Restyle the map overlay (`LocationSearch` input and results list) with Tailwind/shadcn, preserving its existing interaction and keyboard-handling logic as-is.
- Restyle the `SchoolMarker` popup: strip Leaflet's default popup chrome (`.leaflet-popup-content-wrapper`'s white background/shadow/radius) via `className` overrides on `<Popup>`, and render the popup content as a shadcn `Card` so it matches the rest of the app's design tokens instead of looking bolted onto Leaflet's default styling.
- Restyle `AdmissionsTable` and `MultiYearAdmissionsTable` using the shadcn `Table` primitive.
- Restyle `SchoolDetailPage`, replacing the bare `<dl>` layout with a proper Tailwind/shadcn layout.
- Apply a baseline sans-serif font (e.g. Inter, or a solid `font-sans` stack) globally.
- **BREAKING**: None — this is a visual-only change. All existing behavior, interactions, and data flows are unchanged.

Explicitly out of scope: dark mode implementation, replacing `LocationSearch`'s hand-rolled combobox logic with a Radix `Command`/`Popover` (no accessibility/interaction rework), and any other behavior changes.

## Capabilities

### New Capabilities
(none — this change introduces no new user-facing capability)

### Modified Capabilities
(none — this is a purely visual/implementation change; no requirement or scenario in `schools-map-view`, `school-detail-view`, or `location-search` changes in behavior)

## Impact

- **Affected code**: `frontend/src/App.css`, `frontend/src/index.css`, `frontend/src/school-detail/school-detail.css` (removed/replaced), `frontend/src/map/MapView.tsx`, `frontend/src/map/LocationSearch.tsx`, `frontend/src/map/SchoolMarker.tsx`, `frontend/src/map/AdmissionsTable.tsx`, `frontend/src/school-detail/SchoolDetailPage.tsx`, `frontend/src/school-detail/MultiYearAdmissionsTable.tsx`, `frontend/index.html` (font loading), `frontend/vite.config.ts` (Tailwind plugin).
- **Dependencies**: adds `tailwindcss` and its Vite plugin, plus shadcn/ui's generated component files and its dependencies (`class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/*` primitives backing the components used, `lucide-react` for icons if used). Installed via `pnpm` per repo conventions.
- **No backend, API, or routing changes.**
