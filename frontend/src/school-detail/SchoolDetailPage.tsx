import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import './school-detail.css'
import {
  admissionsHistoryQueryKey,
  fetchAdmissionsHistory,
  fetchSchoolDetail,
  fetchSchoolsList,
  SCHOOL_DETAIL_STALE_TIME_MS,
  schoolDetailQueryKey,
  schoolsListQueryKey,
} from './api'
import { MultiYearAdmissionsTable } from './MultiYearAdmissionsTable'

export function SchoolDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: schoolsListQueryKey,
    queryFn: fetchSchoolsList,
  })

  const school = schools?.find((s) => s.slug === slug)
  const schoolId = school?.id

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: schoolId !== undefined ? schoolDetailQueryKey(schoolId) : ['school-detail', 'unresolved'],
    queryFn: () => fetchSchoolDetail(schoolId!),
    enabled: schoolId !== undefined,
    staleTime: SCHOOL_DETAIL_STALE_TIME_MS,
  })

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: schoolId !== undefined ? admissionsHistoryQueryKey(schoolId) : ['admissions-history', 'unresolved'],
    queryFn: () => fetchAdmissionsHistory(schoolId!),
    enabled: schoolId !== undefined,
    staleTime: SCHOOL_DETAIL_STALE_TIME_MS,
  })

  if (schoolsLoading) {
    return (
      <div className="school-detail-page">
        <p>Loading…</p>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="school-detail-page">
        <Link to="/">← Back to map</Link>
        <p className="not-found">School not found.</p>
      </div>
    )
  }

  return (
    <div className="school-detail-page">
      <Link to="/">← Back to map</Link>

      {detailLoading || !detail ? (
        <p>Loading school details…</p>
      ) : (
        <>
          <h1>{detail.name}</h1>
          <p>{detail.address}</p>
          {detail.url_address && (
            <p>
              <a href={detail.url_address} target="_blank" rel="noreferrer">
                {detail.url_address}
              </a>
            </p>
          )}
          <dl>
            <dt>Zone</dt>
            <dd>{detail.zone_code ?? '-'}</dd>
            <dt>Nature</dt>
            <dd>{detail.nature_code ?? '-'}</dd>
            <dt>Level</dt>
            <dd>{detail.mainlevel_code}</dd>
          </dl>
        </>
      )}

      <h2>Admission history</h2>
      {historyLoading ? (
        <p>Loading admission history…</p>
      ) : history && history.phases.length > 0 ? (
        <MultiYearAdmissionsTable phases={history.phases} />
      ) : (
        <p className="no-data-message">No admission data</p>
      )}
    </div>
  )
}
