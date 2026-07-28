import { Circle } from 'react-leaflet'
import type { GeocodeCandidate } from './types'
import { WITHIN_1KM_METERS, WITHIN_2KM_METERS } from './constants'

export function DistanceCircles({ location }: { location: GeocodeCandidate }) {
  const center: [number, number] = [location.latitude, location.longitude]

  return (
    <>
      <Circle
        center={center}
        radius={WITHIN_1KM_METERS}
        pathOptions={{ color: '#059669', fillOpacity: 0.05, weight: 1.5, interactive: false }}
      />
      <Circle
        center={center}
        radius={WITHIN_2KM_METERS}
        pathOptions={{ color: '#b45309', fillOpacity: 0.03, weight: 1.5, interactive: false }}
      />
    </>
  )
}
