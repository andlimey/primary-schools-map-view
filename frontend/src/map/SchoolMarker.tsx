import { useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { School, SchoolAdmissions } from './types'
import { AdmissionsTable } from './AdmissionsTable'
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
      <Popup>
        <strong>{school.name}</strong>
        <br />
        {school.address}
        <div className="admissions-toggle">
          <button type="button" onClick={() => setExpanded((e) => !e)}>
            {expanded ? '▾ Hide admissions' : '▸ Show admissions'}
          </button>
        </div>
        {expanded && (
          <div className="admissions-section">
            {admissionsLoading ? (
              <div className="admissions-message">Loading admissions data…</div>
            ) : admissions ? (
              <>
                {admissionsYear !== null && <div className="admissions-year">{admissionsYear} admissions</div>}
                <AdmissionsTable admissions={admissions} />
              </>
            ) : (
              <div className="admissions-message">
                No admission data{admissionsYear !== null ? ` for ${admissionsYear}` : ''}
              </div>
            )}
          </div>
        )}
        {school.slug && (
          <div className="more-details">
            <Link to={`/schools/${school.slug}`}>More Details</Link>
          </div>
        )}
      </Popup>
    </Marker>
  )
}
