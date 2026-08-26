## Context

`SchoolDetailPage` already fetches `AdmissionsHistoryResponse` (`{ school_id, phases: AdmissionPhaseHistoryEntry[] }`) via `fetchAdmissionsHistory` and renders it as a pivoted table (`MultiYearAdmissionsTable`). Each `AdmissionPhaseHistoryEntry` is `{ year, phase_code, phase_label, vacancy, applied, taken, balloting }`. Phase codes/labels are not stable across years — a phase can be retired or relabeled — which `MultiYearAdmissionsTable`'s `buildTable` already handles by keying columns on `phase_code` and taking the newest-year label.

The frontend has no charting library today (`frontend/package.json` has no chart/visualization dependency); shadcn/ui primitives (Card, Dialog, Table) are already in use, and shadcn's own chart component is built on Recharts, so Recharts is the lowest-friction choice.

## Goals / Non-Goals

**Goals:**
- Let a parent see, at a glance, whether a phase's oversubscription (applied ÷ vacancy) is trending up over the years of available data.
- Reuse the same data already fetched for the table; no new endpoint.
- Keep the chart and table as independent views of the same data — filtering the chart must not affect the table.

**Non-Goals:**
- Charting `taken` or balloting-subcategory figures (balloting applicants/vacancies) — out of scope for this change.
- Persisting the user's phase-filter selection (e.g. in the URL or storage) — resets on page load.
- Changing the table's layout, sort order, or column logic.

## Decisions

**Metric: oversubscription ratio (`applied / vacancy`), not raw counts.**
The table already treats `applied > vacancy` as the notable signal (red highlight). Charting the same ratio makes the chart a direct visual extension of that existing logic rather than introducing a second metric for the parent to learn. Raw counts (applied and vacancy as two lines per phase) were considered but rejected — doubling the series count adds clutter without adding insight, since vacancy is typically stable year-to-year and applied is the value that actually moves.

**One combined chart with phase-toggle filter chips, not small multiples.**
A single chart keeps the "is it getting more competitive" comparison across phases on one axis. Filter chips (one per phase, all on by default) let the parent narrow to the phases they care about without needing a separate chart per phase. Chips control chart series visibility only — the table is unaffected, per explicit product decision.

**Reference line at 100% (ratio = 1.0).**
Marks the applied = vacancy threshold directly on the chart, visually matching the table's oversubscription highlight.

**Gaps, not interpolation or zero, for missing data.**
A phase/year combination is only plotted if it has vacancy data and `vacancy > 0`. If `vacancy` is `0` or `null`, or the phase has no entry for that year, that point is a gap in the phase's line (Recharts `connectNulls={false}`) rather than drawn as `0` or bridged across the missing year — either would misrepresent absence of data as a real value.

**Phase identity and ordering follows `MultiYearAdmissionsTable`'s existing convention.**
Series are keyed by `phase_code` (stable identity), labeled with that phase's most recent `phase_label`, ordered newest-active-phase-first — the same derivation `buildTable` already does in `MultiYearAdmissionsTable.tsx`. This avoids inventing a second, possibly inconsistent, phase-ordering rule for the chart.

**X-axis: chronological ascending (oldest → newest).**
The table sorts years newest-first because that's the more useful read for "what happened this cycle." A trend chart reads naturally left-to-right in time order, so the chart uses ascending years independent of the table's sort.

**New dependency: `recharts`.**
Chosen over a hand-rolled SVG chart because line charts with a reference line, tooltips, and legend/filter interaction are exactly Recharts' sweet spot, and it's the library shadcn's own chart primitives assume — keeping the project's charting story consistent with its existing shadcn/ui usage.

## Risks / Trade-offs

- **[Risk]** Recharts is a new, moderately-sized dependency (adds to bundle size) for a single chart. → **Mitigation**: acceptable one-time cost; no alternative avoids it without hand-building interactive tooltip/legend behavior, which is more code to maintain long-term.
- **[Risk]** A school with very few years of data (1-2 years) will show a nearly-flat or single-point line, which may look broken rather than "not enough data yet." → **Mitigation**: not addressed by this change; matches the existing table's behavior of just showing what data exists. Revisit only if it proves confusing in practice.
- **[Risk]** Ratio can spike arbitrarily high when vacancy is very small (e.g. vacancy=1, applied=20 → 2000%), which could visually flatten more typical phases on a shared y-axis. → **Mitigation**: use Recharts' auto-domain for now; not solving axis-clamping/log-scale in this change, since it needs real data to judge whether it's actually a problem.

## Open Questions

- Should the y-axis be capped/clamped for extreme outlier ratios once real data is checked against this design, or is auto-scaling sufficient? Deferred until implementation surfaces actual data ranges.
