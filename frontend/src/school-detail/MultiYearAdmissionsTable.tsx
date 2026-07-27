import type { AdmissionPhaseHistoryEntry } from './types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
    <Table className="text-sm">
      <TableHeader>
        <TableRow>
          <TableHead>Phase</TableHead>
          {years.map((year) => (
            <TableHead key={year}>{year}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.phaseCode}>
            <TableCell className="font-medium whitespace-nowrap">{row.label}</TableCell>
            {years.map((year) => {
              const entry = row.byYear.get(year)
              if (!entry) {
                return (
                  <TableCell key={year} className="text-muted-foreground text-center">
                    -
                  </TableCell>
                )
              }
              return (
                <TableCell key={year} className="whitespace-normal">
                  <div>
                    Vacancy {entry.vacancy ?? '-'} · Applied {entry.applied ?? '-'} · Taken {entry.taken ?? '-'}
                  </div>
                  {entry.balloting && (
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {entry.balloting.category_code}: {entry.balloting.applicants ?? '?'}/
                      {entry.balloting.vacancies ?? '?'}
                    </div>
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
