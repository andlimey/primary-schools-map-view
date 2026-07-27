import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { GeocodeCandidate } from './types'
import { METERS_PER_DEGREE_LAT, SEARCH_RADIUS_METERS } from './constants'

export function PanToSearch({ location }: { location: GeocodeCandidate | null }) {
  const map = useMap()

  useEffect(() => {
    if (!location) return
    const latOffset = SEARCH_RADIUS_METERS / METERS_PER_DEGREE_LAT
    const lngOffset =
      SEARCH_RADIUS_METERS / (METERS_PER_DEGREE_LAT * Math.cos((location.latitude * Math.PI) / 180))
    map.fitBounds([
      [location.latitude - latOffset, location.longitude - lngOffset],
      [location.latitude + latOffset, location.longitude + lngOffset],
    ])
  }, [location, map])

  return null
}
