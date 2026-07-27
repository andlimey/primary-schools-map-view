import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link to="/" className="text-primary text-sm underline-offset-4 hover:underline">
          ← Back to map
        </Link>
        <p className="text-muted-foreground mt-4 text-sm">School not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 pb-12">
      <Link to="/" className="text-primary text-sm underline-offset-4 hover:underline">
        ← Back to map
      </Link>

      {detailLoading || !detail ? (
        <p className="text-muted-foreground text-sm">Loading school details…</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{detail.name}</CardTitle>
            <CardDescription>{detail.address}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {detail.url_address && (
              <a
                href={detail.url_address}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm underline-offset-4 hover:underline"
              >
                {detail.url_address}
              </a>
            )}
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground font-medium">Zone</dt>
              <dd>{detail.zone_code ?? '-'}</dd>
              <dt className="text-muted-foreground font-medium">Nature</dt>
              <dd>{detail.nature_code ?? '-'}</dd>
              <dt className="text-muted-foreground font-medium">Level</dt>
              <dd>{detail.mainlevel_code}</dd>
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Admission history</h2>
        {historyLoading ? (
          <p className="text-muted-foreground text-sm">Loading admission history…</p>
        ) : history && history.phases.length > 0 ? (
          <Card className="py-0">
            <MultiYearAdmissionsTable phases={history.phases} />
          </Card>
        ) : (
          <p className="text-muted-foreground text-sm">No admission data</p>
        )}
      </div>
    </div>
  )
}
