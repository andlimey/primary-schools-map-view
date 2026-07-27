import type { SchoolAdmissions } from './types'

export function AdmissionsTable({ admissions }: { admissions: SchoolAdmissions }) {
  return (
    <table className="admissions-table">
      <thead>
        <tr>
          <th>Phase</th>
          <th>Vacancy</th>
          <th>Applied</th>
          <th>Taken</th>
          <th>Balloted</th>
        </tr>
      </thead>
      <tbody>
        {admissions.phases.map((phase) => (
          <tr key={phase.phase_code}>
            <td>{phase.phase_label}</td>
            <td>{phase.vacancy ?? '-'}</td>
            <td>{phase.applied ?? '-'}</td>
            <td>{phase.taken ?? '-'}</td>
            <td>
              {phase.balloting
                ? `${phase.balloting.category_code}: ${phase.balloting.applicants ?? '?'}/${phase.balloting.vacancies ?? '?'}`
                : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
