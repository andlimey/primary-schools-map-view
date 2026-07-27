import type { SchoolAdmissions } from './types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function AdmissionsTable({ admissions }: { admissions: SchoolAdmissions }) {
  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="h-7 px-1.5 text-xs">Phase</TableHead>
          <TableHead className="h-7 px-1.5 text-xs">Vacancy</TableHead>
          <TableHead className="h-7 px-1.5 text-xs">Applied</TableHead>
          <TableHead className="h-7 px-1.5 text-xs">Taken</TableHead>
          <TableHead className="h-7 px-1.5 text-xs">Balloted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {admissions.phases.map((phase) => (
          <TableRow key={phase.phase_code}>
            <TableCell className="px-1.5 py-1 whitespace-normal">{phase.phase_label}</TableCell>
            <TableCell className="px-1.5 py-1">{phase.vacancy ?? '-'}</TableCell>
            <TableCell className="px-1.5 py-1">{phase.applied ?? '-'}</TableCell>
            <TableCell className="px-1.5 py-1">{phase.taken ?? '-'}</TableCell>
            <TableCell className="px-1.5 py-1 whitespace-normal">
              {phase.balloting
                ? `${phase.balloting.category_code}: ${phase.balloting.applicants ?? '?'}/${phase.balloting.vacancies ?? '?'}`
                : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
