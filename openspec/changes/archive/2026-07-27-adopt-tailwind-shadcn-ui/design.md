## Context

The frontend (`frontend/`) is a Vite + React 19 app with no CSS framework: `App.css`, `index.css`, and `school-detail/school-detail.css` are hand-written, using raw hex colors and no design tokens, no loaded font, and no dark mode despite `:root { color-scheme: light dark }` in `index.css`. Styled surfaces are: the full-bleed Leaflet `MapView`, a floating `LocationSearch` combobox (hand-rolled keyboard handling, no ARIA), `SchoolMarker`'s Leaflet `Popup` content (raw `<strong>`/`<br>`/`<table>`), `AdmissionsTable` and `MultiYearAdmissionsTable` (plain `<table>`), and `SchoolDetailPage` (bare `<dl>`). The app has no forms, modals, or complex data grids — everything currently rendered is static or driven by simple client-side state (search results, expand/collapse toggles).

This is a visual-only change: no requirement or interaction behavior described in `openspec/specs/schools-map-view`, `openspec/specs/school-detail-view`, or `openspec/specs/location-search` changes.

## Goals / Non-Goals

**Goals:**
- Establish Tailwind CSS as the app's styling layer, replacing all hand-written CSS files.
- Adopt shadcn/ui's `Card`, `Table`, `Input`, and `Button` primitives (copied into the repo, not an opaque npm dependency) for the components where they fit.
- Make the Leaflet popup render as a shadcn `Card` rather than inside Leaflet's default popup chrome.
- Apply a single global sans-serif font.

**Non-Goals:**
- No dark mode implementation (though shadcn's CSS-variable token setup does not preclude adding it later).
- No rework of `LocationSearch`'s interaction model — its existing debounce/keyboard-nav/state logic in `frontend/src/map/LocationSearch.tsx` is preserved; only markup/classNames change. Swapping to Radix `Command`/`Popover` is a separate, future decision.
- No new data-table functionality (sorting, filtering, pagination) — `AdmissionsTable`/`MultiYearAdmissionsTable` stay static tables, just restyled with shadcn's `Table` primitive.
- No change to routing, API calls, or React Query usage.

## Decisions

**Tailwind + shadcn/ui over MUI or Ant Design.**
MUI and Ant both ship a full opinionated component system (theming engine, CSS-in-JS or heavy CSS runtime, complex components like DataGrid/DatePicker this app doesn't need) and read visually as "enterprise admin dashboard," which doesn't fit a small public-facing map tool. Tailwind + shadcn keeps the bundle light next to Leaflet (already the heaviest dependency) and shadcn's components are copied into the repo as plain Tailwind-styled Radix wrappers, so there's no opaque library styling to fight and no separate theming API to learn.

**Tailwind + shadcn/ui over Radix alone.**
Radix alone provides only unstyled behavior primitives — every component would still need Tailwind classes written from scratch. shadcn already provides that styling layer on top of Radix, including the interaction/keyboard/focus-management pieces `LocationSearch` currently lacks — useful even though this change doesn't adopt shadcn's `Command` component yet, since it keeps that migration path open without extra setup later.

**Strip Leaflet's popup chrome rather than style around it.**
`react-leaflet`'s `<Popup>` wraps children in `.leaflet-popup-content-wrapper` (Leaflet's own white background, border-radius, and box-shadow). Left in place, a shadcn `Card` rendered inside it would double up chrome (Leaflet's box-shadow/radius plus the Card's). The popup wrapper's default styling is overridden via a `className` passed to `<Popup>` (e.g. `className="!bg-transparent !p-0 !shadow-none"` or an equivalent scoped override in the global stylesheet) so the `Card` inside becomes the only visible chrome, matching the rest of the app's surfaces.

**Single global font, no font-loading service dependency.**
Given the small scope, use a solid system-ui-based `font-sans` stack (already Tailwind's default) rather than adding a webfont loading dependency (e.g. `@fontsource/inter`), unless a specific typeface is later requested. This avoids adding a new network dependency/FOUT concern for a visual-only change.

## Risks / Trade-offs

- **[Risk]** Overriding Leaflet's popup chrome via `!important`-style Tailwind overrides is inherently a bit fragile if `react-leaflet`'s internal DOM structure changes in a future major version. → **Mitigation**: scope the override to a single documented className/selector; it's a one-line change to update if `react-leaflet` changes its popup wrapper markup.
- **[Risk]** Restyling every component in one change is a large diff to review visually. → **Mitigation**: `tasks.md` sequences the work component-by-component (search → popup → tables → detail page), so each piece can be checked in the running app before moving to the next.
- **[Trade-off]** Not adopting Radix `Command` for `LocationSearch` now means its combobox still lacks ARIA roles/attributes after this change — deferred deliberately to keep this change visual-only, per the proposal's stated scope.

## Migration Plan

1. Add `tailwindcss` (Vite plugin) to `frontend/vite.config.ts` and `frontend/package.json`; remove the old CSS files once their rules are ported.
2. Initialize shadcn/ui in `frontend/`, adding only the `Card`, `Table`, `Input`, and `Button` components used.
3. Restyle components in order: app shell/font → `LocationSearch` → `SchoolMarker` popup (incl. Leaflet chrome strip) → `AdmissionsTable` → `SchoolDetailPage` / `MultiYearAdmissionsTable`.
4. Manually verify each restyled surface in the running dev app (`pnpm dev`) before moving to the next, per repo convention of testing UI changes in-browser.

No rollback complexity beyond normal git revert — no data migration, no API changes, no persisted state affected.

## Open Questions

None outstanding — scope and approach were confirmed during exploration (visual-polish only, popup chrome stripped, Tailwind + shadcn/ui).
