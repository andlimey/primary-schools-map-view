import { memo, useCallback, useMemo, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { Marker as LeafletMarker } from 'leaflet'
import type { GeocodeCandidate, School, SchoolAdmissions } from './types'
import type { DistanceBand } from './distance'
import { defaultSchoolIcon, within1kmSchoolIcon, within2kmSchoolIcon } from './leaflet-icons'
import { AdmissionsTable } from './AdmissionsTable'
import { TravelSection } from './TravelSection'
import type { TravelMode } from './travel'
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
  distanceBand: DistanceBand
  searchedLocation: GeocodeCandidate | null
  /** Which travel mode (if any) is drawn on the map for *this* school. Owned by MapView. */
  activeRouteMode: TravelMode | null
  onToggleDraw: (schoolId: number, mode: TravelMode) => void
  /** Hands this school's Leaflet marker to MapView, which opens/closes its popup around
   * drawing a route. */
  onMarkerRef: (schoolId: number, marker: LeafletMarker | null) => void
}

const DISTANCE_BAND_ICONS = {
  'within-1km': within1kmSchoolIcon,
  'within-2km': within2kmSchoolIcon,
}

// Memoised: MapView re-renders on every route toggle, but only the affected marker's props change.
export const SchoolMarker = memo(function SchoolMarker({
  school,
  admissionsById,
  admissionsYear,
  admissionsLoading,
  distanceBand,
  searchedLocation,
  activeRouteMode,
  onToggleDraw,
  onMarkerRef,
}: SchoolMarkerProps) {
  const [expanded, setExpanded] = useState(true)
  const admissions = admissionsById.get(school.id)
  const queryClient = useQueryClient()
  const icon = distanceBand ? DISTANCE_BAND_ICONS[distanceBand] : defaultSchoolIcon

  const markerRef = useCallback(
    (marker: LeafletMarker | null) => onMarkerRef(school.id, marker),
    [onMarkerRef, school.id],
  )

  // Stable across renders so react-leaflet doesn't unbind and rebind the listener each time.
  const eventHandlers = useMemo(
    () => ({
      popupopen: () => {
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
      },
    }),
    [queryClient, school.id],
  )

  return (
    <Marker
      ref={markerRef}
      position={[school.latitude, school.longitude]}
      icon={icon}
      eventHandlers={eventHandlers}
    >
      <Popup className="school-popup" minWidth={220} maxWidth={340}>
        <Card size="sm" className="w-full shadow-lg">
          <CardHeader>
            <CardTitle>{school.name}</CardTitle>
            <CardDescription>
              {school.postal_code ? `${school.address}, ${school.postal_code}` : school.address}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 min-w-max">
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
            {searchedLocation && (
              <TravelSection
                from={searchedLocation}
                to={school}
                activeMode={activeRouteMode}
                onToggleDraw={(mode) => onToggleDraw(school.id, mode)}
              />
            )}
            {school.slug && (
              <Button
                asChild
                variant="link"
                size="sm"
                className="h-auto justify-start p-0 text-xs"
              >
                <Link to={`/schools/${school.slug}`}>More Details</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </Popup>
    </Marker>
  )
})
