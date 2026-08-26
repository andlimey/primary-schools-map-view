## Why

A parent looking at a school's admission history table has to manually compare applied/vacancy numbers across years to judge whether a phase is becoming more competitive. A trend chart makes that read immediate instead of requiring mental arithmetic across a dense table.

## What Changes

- Add an `AdmissionTrendChart` component to the school detail page, showing each admission phase's oversubscription ratio (applied ÷ vacancy) over time as a line chart, with a reference line at 100% (applied = vacancy) marking the oversubscription threshold.
- Add phase-toggle filter chips above the chart to show/hide individual phase lines. The chips affect only the chart; the existing admissions table is unaffected and continues showing all phases/years.
- Place the chart above the existing `MultiYearAdmissionsTable`, both under the "Admission history" heading.
- A phase/year with no vacancy data (vacancy null or 0) or no entry at all is omitted from that phase's line (gap), not interpolated or shown as zero.
- Add `recharts` as a new frontend dependency.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `school-detail-view`: detail page gains a trend chart of oversubscription ratio per phase, above the existing admissions table, with phase filter chips scoped to the chart only.

## Impact

- Affected code: `frontend/src/school-detail/SchoolDetailPage.tsx`, new `frontend/src/school-detail/AdmissionTrendChart.tsx`.
- Affected data: derives entirely from the already-fetched `AdmissionsHistoryResponse` (`fetchAdmissionsHistory`) — no API or backend changes.
- New dependency: `recharts` added to `frontend/package.json`.
