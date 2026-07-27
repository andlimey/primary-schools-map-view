import type { AdmissionPhaseHistoryEntry } from './types'

interface PhaseRow {
  phaseCode: string
  label: string
  byYear: Map<number, AdmissionPhaseHistoryEntry>
}

function buildRows(phases: AdmissionPhaseHistoryEntry[]): { years: number[]; rows: PhaseRow[] } {
  const years = [...new Set(phases.map((phase) => phase.year))].sort((a, b) => a - b)

  // Walk newest-year-first so each phase's row label reflects its most recent phase_label,
  // and phases retired in earlier years still get a row (appended after still-active ones).
  const rowOrder: string[] = []
  const rowsByCode = new Map<string, PhaseRow>()
  for (const phase of [...phases].sort((a, b) => b.year - a.year)) {
    let row = rowsByCode.get(phase.phase_code)
    if (!row) {
      row = { phaseCode: phase.phase_code, label: phase.phase_label, byYear: new Map() }
      rowsByCode.set(phase.phase_code, row)
      rowOrder.push(phase.phase_code)
    }
    row.byYear.set(phase.year, phase)
  }

  return { years, rows: rowOrder.map((code) => rowsByCode.get(code)!) }
}

export function MultiYearAdmissionsTable({ phases }: { phases: AdmissionPhaseHistoryEntry[] }) {
  const { years, rows } = buildRows(phases)

  return (
    <table className="multi-year-admissions-table">
      <thead>
        <tr>
          <th>Phase</th>
          {years.map((year) => (
            <th key={year}>{year}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.phaseCode}>
            <td>{row.label}</td>
            {years.map((year) => {
              const entry = row.byYear.get(year)
              if (!entry) {
                return (
                  <td key={year} className="no-data">
                    -
                  </td>
                )
              }
              return (
                <td key={year}>
                  <div>
                    Vacancy {entry.vacancy ?? '-'} · Applied {entry.applied ?? '-'} · Taken {entry.taken ?? '-'}
                  </div>
                  {entry.balloting && (
                    <div className="balloting-detail">
                      {entry.balloting.category_code}: {entry.balloting.applicants ?? '?'}/
                      {entry.balloting.vacancies ?? '?'}
                    </div>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
