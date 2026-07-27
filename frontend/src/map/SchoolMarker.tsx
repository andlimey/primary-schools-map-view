import { useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { School, SchoolAdmissions } from './types'
import { AdmissionsTable } from './AdmissionsTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  admissionsHistoryQueryKey,
  fetchAdmissionsHistory,
  fetchSchoolDetail,
  SCHOOL_DETAIL_STALE_TIME_MS,
  schoolDetailQueryKey,
} from '../school-detail/api'

interface SchoolMarkerProps {
  school: School
  admissionsById: Map<number, SchoolAdmissions>
  admissionsYear: number | null
  admissionsLoading: boolean
}

export function SchoolMarker({ school, admissionsById, admissionsYear, admissionsLoading }: SchoolMarkerProps) {
  const [expanded, setExpanded] = useState(false)
  const admissions = admissionsById.get(school.id)
  const queryClient = useQueryClient()

  function prefetchDetailPageData() {
    queryClient.prefetchQuery({
      queryKey: schoolDetailQueryKey(school.id),
      queryFn: () => fetchSchoolDetail(school.id),
      staleTime: SCHOOL_DETAIL_STALE_TIME_MS,
    })
    queryClient.prefetchQuery({
      queryKey: admissionsHistoryQueryKey(school.id),
      queryFn: () => fetchAdmissionsHistory(school.id),
      staleTime: SCHOOL_DETAIL_STALE_TIME_MS,
    })
  }

  return (
    <Marker position={[school.latitude, school.longitude]} eventHandlers={{ popupopen: prefetchDetailPageData }}>
      <Popup className="school-popup" minWidth={220} maxWidth={340}>
        <Card size="sm" className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>{school.name}</CardTitle>
            <CardDescription>{school.address}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto justify-start p-0 text-xs"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? '▾ Hide admissions' : '▸ Show admissions'}
            </Button>
            {expanded && (
              <div>
                {admissionsLoading ? (
                  <div className="text-muted-foreground text-xs">Loading admissions data…</div>
                ) : admissions ? (
                  <>
                    {admissionsYear !== null && (
                      <div className="mb-1 text-xs font-semibold">{admissionsYear} admissions</div>
                    )}
                    <AdmissionsTable admissions={admissions} />
                  </>
                ) : (
                  <div className="text-muted-foreground text-xs">
                    No admission data{admissionsYear !== null ? ` for ${admissionsYear}` : ''}
                  </div>
                )}
              </div>
            )}
            {school.slug && (
              <Link to={`/schools/${school.slug}`} className="text-primary text-xs underline-offset-4 hover:underline">
                More Details
              </Link>
            )}
          </CardContent>
        </Card>
      </Popup>
    </Marker>
  )
}
