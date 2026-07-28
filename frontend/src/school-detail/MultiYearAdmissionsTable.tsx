import type { AdmissionPhaseHistoryEntry } from './types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PhaseColumn {
  phaseCode: string
  label: string
}

function buildTable(phases: AdmissionPhaseHistoryEntry[]): {
  years: number[]
  phaseColumns: PhaseColumn[]
  cellsByYear: Map<number, Map<string, AdmissionPhaseHistoryEntry>>
} {
  const years = [...new Set(phases.map((phase) => phase.year))].sort((a, b) => b - a)

  // Walk newest-year-first so each phase's column label reflects its most recent phase_label,
  // and phases retired in earlier years still get a column (appended after still-active ones).
  const phaseOrder: string[] = []
  const phaseLabelByCode = new Map<string, string>()
  const cellsByYear = new Map<number, Map<string, AdmissionPhaseHistoryEntry>>()
  for (const phase of [...phases].sort((a, b) => b.year - a.year)) {
    if (!phaseLabelByCode.has(phase.phase_code)) {
      phaseLabelByCode.set(phase.phase_code, phase.phase_label)
      phaseOrder.push(phase.phase_code)
    }
    let yearCells = cellsByYear.get(phase.year)
    if (!yearCells) {
      yearCells = new Map()
      cellsByYear.set(phase.year, yearCells)
    }
    yearCells.set(phase.phase_code, phase)
  }

  const phaseColumns = phaseOrder.map((code) => ({ phaseCode: code, label: phaseLabelByCode.get(code)! }))

  return { years, phaseColumns, cellsByYear }
}

function formatBallotingChance(vacancies: number | null, applicants: number | null): string {
  if (vacancies == null || applicants == null || applicants <= 0) return '-'
  return `${Math.round(Math.min(1, vacancies / applicants) * 100)}%`
}

function AdmissionCell({ entry }: { entry: AdmissionPhaseHistoryEntry }) {
  const isOversubscribed = entry.applied != null && entry.vacancy != null && entry.applied > entry.vacancy

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'w-full rounded px-1.5 py-0.5 text-left hover:bg-muted',
            isOversubscribed && 'bg-destructive/10 text-destructive hover:bg-destructive/20'
          )}
        >
          {entry.applied ?? '-'}/{entry.vacancy ?? '-'}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Phase ${entry.phase_code}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          <div>Applied: {entry.applied ?? '-'}</div>
          <div>Vacancy: {entry.vacancy ?? '-'}</div>
          <div>Taken: {entry.taken ?? '-'}</div>
        </div>
        {entry.balloting && (
          <>
            <hr className="border-border" />
            <div className="space-y-1 text-sm">
              <div className="font-medium">{entry.balloting.category_label}</div>
              {
                entry.balloting && entry.balloting.vacancies ? 
                  <>
                    <div>Applied: {entry.balloting.applicants ?? '-'}</div>
                    <div>Vacancy: {entry.balloting.vacancies ?? '-'}</div>
                    <div>
                      Balloting chance: {formatBallotingChance(entry.balloting.vacancies, entry.balloting.applicants)}
                    </div>
                  </>
                 : null
              }
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function MultiYearAdmissionsTable({ phases }: { phases: AdmissionPhaseHistoryEntry[] }) {
  const { years, phaseColumns, cellsByYear } = buildTable(phases)

  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow>
          <TableHead>Year</TableHead>
          {phaseColumns.map((col) => (
            <TableHead key={col.phaseCode}>{col.label}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {years.map((year) => (
          <TableRow key={year}>
            <TableCell className="font-medium whitespace-nowrap">{year}</TableCell>
            {phaseColumns.map((col) => {
              const entry = cellsByYear.get(year)?.get(col.phaseCode)
              if (!entry) {
                return (
                  <TableCell key={col.phaseCode} className="text-muted-foreground text-center">
                    -
                  </TableCell>
                )
              }
              return (
                <TableCell key={col.phaseCode} className="whitespace-normal p-1">
                  <AdmissionCell entry={entry} />
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
