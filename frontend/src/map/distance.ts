import { WITHIN_1KM_METERS, WITHIN_2KM_METERS } from './constants'

const EARTH_RADIUS_METERS = 6_371_000

export type DistanceBand = 'within-1km' | 'within-2km' | null

interface LatLng {
  latitude: number
  longitude: number
}

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

export function getDistanceBand(distanceMeters: number): DistanceBand {
  if (distanceMeters < WITHIN_1KM_METERS) return 'within-1km'
  if (distanceMeters < WITHIN_2KM_METERS) return 'within-2km'
  return null
}
