import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { School } from './types'

export function FitToSchools({ schools }: { schools: School[] }) {
  const map = useMap()

  useEffect(() => {
    if (schools.length === 0) return
    const bounds = L.latLngBounds(schools.map((school) => [school.latitude, school.longitude]))
    map.fitBounds(bounds, { padding: [24, 24] })
  }, [schools, map])

  return null
}
