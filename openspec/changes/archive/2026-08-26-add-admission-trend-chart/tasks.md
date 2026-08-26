## 1. Setup

- [x] 1.1 Add `recharts` to `frontend/package.json` and install with `pnpm`.

## 2. Chart data derivation

- [x] 2.1 Add a pure function (e.g. in `AdmissionTrendChart.tsx` or a colocated helper) that takes `AdmissionPhaseHistoryEntry[]` and produces: the ordered list of phase columns (code + latest label, newest-active-phase-first, reusing the same derivation approach as `MultiYearAdmissionsTable`'s `buildTable`), and per-year rows of `{ year, [phase_code]: ratio | undefined }` where ratio is `applied / vacancy` only when `vacancy` is present and > 0, sorted chronologically ascending.
- [x] 2.2 Add a unit test (or verify via existing test setup, if any) covering: a phase missing in some years, a phase with `vacancy` null or 0, and multiple phases with overlapping and non-overlapping year ranges. (No test runner exists anywhere in `frontend/` today; adding one is out of scope for this change, so this was verified manually via the dev-server checks in section 5 instead.)

## 3. AdmissionTrendChart component

- [x] 3.1 Create `frontend/src/school-detail/AdmissionTrendChart.tsx` rendering a Recharts `LineChart` with one `Line` per phase (keyed by `phase_code`, `connectNulls={false}`), x-axis = year ascending, y-axis = ratio as a percentage, and a `ReferenceLine` at 100%.
- [x] 3.2 Add phase-toggle filter chips above the chart, one per phase column, all on by default; toggling a chip shows/hides only that phase's `Line` (component-local state, no effect on the table).
- [x] 3.3 Style chips and chart to match existing shadcn/ui conventions used elsewhere on the detail page (Card wrapper, consistent spacing/typography with `MultiYearAdmissionsTable`'s section).

## 4. Wire into SchoolDetailPage

- [x] 4.1 In `frontend/src/school-detail/SchoolDetailPage.tsx`, render `AdmissionTrendChart` above `MultiYearAdmissionsTable` inside the "Admission history" section, passing `history.phases`, only when `history.phases.length > 0` (matching the existing table's empty-state branch).

## 5. Verification

- [x] 5.1 Run the app (`pnpm dev`) and manually check a school with multi-year, multi-phase data: chart renders, gaps appear where expected, 100% reference line is visible, chips toggle chart lines without changing the table. (Verified against `ai-tong`, which has 4 years × 6 phases, via a headless-browser screenshot; toggling the "Phase 1" chip hid only that line and left the table unchanged, no console errors. Phases with `vacancy = 0` in every year, e.g. `2C(S)` and `3`, correctly render no line at all rather than a plotted `0%`, confirming the gap logic.)
- [x] 5.2 Manually check a school with sparse/no admission data: no chart is rendered, existing "No admission data" message still shows, no console errors. (No school in the current dataset actually has zero admission records to click through, so this was verified by code inspection instead: `AdmissionTrendChart` and `MultiYearAdmissionsTable` are both inside the same `history.phases.length > 0` branch in `SchoolDetailPage.tsx`, so the untouched empty-state branch still governs both.)
- [x] 5.3 Run `pnpm lint` and `pnpm build` in `frontend/` to confirm no type or lint errors. (Both clean; only a pre-existing, unrelated lint warning in `button.tsx`.)
