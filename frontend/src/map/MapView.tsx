import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { Marker as LeafletMarker } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { searchMarkerIcon } from './leaflet-icons'
import { SINGAPORE_CENTER, DEFAULT_ZOOM } from './constants'
import { haversineDistanceMeters, getDistanceBand, type DistanceBand } from './distance'
import type { School, GeocodeCandidate, AdmissionsResponse, SchoolAdmissions } from './types'
import {
  parseSearchLocation,
  serializeSearchLocation,
  SEARCH_PARAM_KEYS,
} from './searchLocationParams'
import { useAutoViewport } from './useAutoViewport'
import { LocationSearch } from './LocationSearch'
import { SchoolMarker } from './SchoolMarker'
import { DistanceCircles } from './DistanceCircles'
import { DistanceLegend } from './DistanceLegend'
import { RouteChip } from './RouteChip'
import { RouteLayer } from './RouteLayer'
import type { TravelMode } from './travel'

interface ActiveRoute {
  schoolId: number
  mode: TravelMode
}

function fetchAdmissions(): Promise<AdmissionsResponse> {
  return fetch('/api/schools/admissions').then((res) => {
    if (!res.ok) throw new Error(`Admissions request failed: ${res.status}`)
    return res.json() as Promise<AdmissionsResponse>
  })
}

/** Null-rendering host for map-context effects, so they can call `useMap()`. */
function MapEffects({
  schools,
  searchedLocation,
}: {
  schools: School[]
  searchedLocation: GeocodeCandidate | null
}) {
  useAutoViewport({ schools, searchedLocation })
  return null
}

export function MapView() {
  const [schools, setSchools] = useState<School[]>([])
  const [searchParams, setSearchParams] = useSearchParams()

  // The one route drawn on the map at a time (across every school). Owned here so a single
  // fixed-position RouteChip can render it and so the "one at a time" invariant is explicit
  // rather than an accident of Leaflet's popup auto-close.
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null)
  // Each school's Leaflet marker, so drawing a route can close that school's popup (it would
  // sit on top of the line) and dismissing the chip can reopen it.
  const markersRef = useRef(new Map<number, LeafletMarker>())

  const registerMarker = useCallback((schoolId: number, marker: LeafletMarker | null) => {
    if (marker) markersRef.current.set(schoolId, marker)
    else markersRef.current.delete(schoolId)
  }, [])

  const toggleRoute = useCallback((schoolId: number, mode: TravelMode) => {
    setActiveRoute((current) =>
      current && current.schoolId === schoolId && current.mode === mode
        ? null
        : { schoolId, mode },
    )
    markersRef.current.get(schoolId)?.closePopup()
  }, [])

  const dismissRoute = useCallback(() => {
    if (activeRoute) markersRef.current.get(activeRoute.schoolId)?.openPopup()
    setActiveRoute(null)
  }, [activeRoute])

  // Derive the searched location from the URL (the single source of truth), and
  // memoise on the raw param strings so its object identity only changes when the
  // q/lat/lng params do — downstream effects depend on that stability.
  const rawQ = searchParams.get('q')
  const rawLat = searchParams.get('lat')
  const rawLng = searchParams.get('lng')
  const searchedLocation = useMemo(
    () => parseSearchLocation(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawQ, rawLat, rawLng],
  )

  const commitSearchedLocation = useCallback(
    (candidate: GeocodeCandidate) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        const serialized = serializeSearchLocation(candidate)
        for (const key of SEARCH_PARAM_KEYS) next.set(key, serialized[key])
        return next
      })
    },
    [setSearchParams],
  )

  const clearSearchedLocation = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const key of SEARCH_PARAM_KEYS) next.delete(key)
      return next
    })
  }, [setSearchParams])

  useEffect(() => {
    fetch('/api/schools')
      .then((res) => res.json())
      .then(setSchools)
      .catch((err) => console.error('Failed to load schools', err))
  }, [])

  const { data: admissionsData, isLoading: admissionsLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn: fetchAdmissions,
  })

  const admissionsById = useMemo(() => {
    const map = new Map<number, SchoolAdmissions>()
    for (const entry of admissionsData?.schools ?? []) {
      map.set(entry.school_id, entry)
    }
    return map
  }, [admissionsData])

  const distanceBandsById = useMemo(() => {
    const map = new Map<number, DistanceBand>()
    if (!searchedLocation) return map
    for (const school of schools) {
      map.set(school.id, getDistanceBand(haversineDistanceMeters(searchedLocation, school)))
    }
    return map
  }, [schools, searchedLocation])

  // A drawn route runs from the searched location, so clearing the search clears the route.
  useEffect(() => {
    if (!searchedLocation) setActiveRoute(null)
  }, [searchedLocation])

  const drawnRoute = useMemo(() => {
    const school = activeRoute && schools.find((s) => s.id === activeRoute.schoolId)
    return school ? { school, mode: activeRoute.mode } : null
  }, [activeRoute, schools])

  return (
    <MapContainer center={SINGAPORE_CENTER} zoom={DEFAULT_ZOOM} zoomSnap={0.25} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationSearch
        initialQuery={searchedLocation?.label ?? ''}
        onSelect={commitSearchedLocation}
        onClear={clearSearchedLocation}
      />
      {searchedLocation && <DistanceLegend />}
      {drawnRoute && searchedLocation && (
        <>
          <RouteLayer from={searchedLocation} to={drawnRoute.school} mode={drawnRoute.mode} />
          <RouteChip
            from={searchedLocation}
            to={drawnRoute.school}
            mode={drawnRoute.mode}
            onDismiss={dismissRoute}
          />
        </>
      )}
      <MapEffects schools={schools} searchedLocation={searchedLocation} />
      {searchedLocation && <DistanceCircles location={searchedLocation} />}
      {schools.map((school) => (
        <SchoolMarker
          key={school.id}
          school={school}
          admissionsById={admissionsById}
          admissionsYear={admissionsData?.year ?? null}
          admissionsLoading={admissionsLoading}
          distanceBand={distanceBandsById.get(school.id) ?? null}
          searchedLocation={searchedLocation}
          activeRouteMode={activeRoute?.schoolId === school.id ? activeRoute.mode : null}
          onToggleDraw={toggleRoute}
          onMarkerRef={registerMarker}
        />
      ))}
      {searchedLocation && (
        <Marker
          position={[searchedLocation.latitude, searchedLocation.longitude]}
          icon={searchMarkerIcon}
        >
          <Popup className="school-popup" minWidth={160} maxWidth={280}>
            <div className="bg-card text-card-foreground rounded-xl px-3 py-2 text-sm shadow-lg ring-1 ring-foreground/10">
              {searchedLocation.label}
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
