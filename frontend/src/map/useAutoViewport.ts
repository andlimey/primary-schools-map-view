import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { GeocodeCandidate, School } from './types'
import { METERS_PER_DEGREE_LAT, SEARCH_RADIUS_METERS } from './constants'

type LatLngBoundsTuple = [[number, number], [number, number]]

function schoolsBounds(schools: School[]): LatLngBoundsTuple | null {
  if (schools.length === 0) return null
  let minLat = Infinity
  let minLng = Infinity
  let maxLat = -Infinity
  let maxLng = -Infinity
  for (const school of schools) {
    minLat = Math.min(minLat, school.latitude)
    maxLat = Math.max(maxLat, school.latitude)
    minLng = Math.min(minLng, school.longitude)
    maxLng = Math.max(maxLng, school.longitude)
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

function searchRadiusBounds(location: GeocodeCandidate): LatLngBoundsTuple {
  const latOffset = SEARCH_RADIUS_METERS / METERS_PER_DEGREE_LAT
  const lngOffset =
    SEARCH_RADIUS_METERS / (METERS_PER_DEGREE_LAT * Math.cos((location.latitude * Math.PI) / 180))
  return [
    [location.latitude - latOffset, location.longitude - lngOffset],
    [location.latitude + latOffset, location.longitude + lngOffset],
  ]
}

/**
 * Single owner of automatic viewport changes. Priority:
 *  1. If a search location is active, frame a >=3km-radius view of it.
 *  2. Otherwise, on the first load with schools available, fit to their extent.
 *
 * Once any automatic fit has happened, the fit-to-all-schools step never runs
 * again — so clearing a search (or navigating back to a no-search URL) leaves the
 * viewport where it is rather than snapping back to the Singapore-wide view.
 *
 * Replaces the former `<PanToSearch>` and `<FitToSchools>` components; folding
 * both into one effect removes the race between their two `fitBounds` calls.
 */
export function useAutoViewport({
  schools,
  searchedLocation,
}: {
  schools: School[]
  searchedLocation: GeocodeCandidate | null
}) {
  const map = useMap()
  const didAutoFit = useRef(false)

  useEffect(() => {
    if (searchedLocation) {
      map.fitBounds(searchRadiusBounds(searchedLocation))
      didAutoFit.current = true
      return
    }
    if (didAutoFit.current) return
    const bounds = schoolsBounds(schools)
    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24] })
      didAutoFit.current = true
    }
  }, [map, schools, searchedLocation])
}
