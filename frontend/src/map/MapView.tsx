import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import 'leaflet/dist/leaflet.css'
import { searchMarkerIcon } from './leaflet-icons'
import { SINGAPORE_CENTER, DEFAULT_ZOOM } from './constants'
import type { School, GeocodeCandidate, AdmissionsResponse, SchoolAdmissions } from './types'
import { FitToSchools } from './FitToSchools'
import { PanToSearch } from './PanToSearch'
import { LocationSearch } from './LocationSearch'
import { SchoolMarker } from './SchoolMarker'

function fetchAdmissions(): Promise<AdmissionsResponse> {
  return fetch('/api/schools/admissions').then((res) => {
    if (!res.ok) throw new Error(`Admissions request failed: ${res.status}`)
    return res.json() as Promise<AdmissionsResponse>
  })
}

export function MapView() {
  const [schools, setSchools] = useState<School[]>([])
  const [searchedLocation, setSearchedLocation] = useState<GeocodeCandidate | null>(null)

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

  return (
    <MapContainer center={SINGAPORE_CENTER} zoom={DEFAULT_ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationSearch onSelect={setSearchedLocation} />
      <FitToSchools schools={schools} />
      <PanToSearch location={searchedLocation} />
      {schools.map((school) => (
        <SchoolMarker
          key={school.id}
          school={school}
          admissionsById={admissionsById}
          admissionsYear={admissionsData?.year ?? null}
          admissionsLoading={admissionsLoading}
        />
      ))}
      {searchedLocation && (
        <Marker
          position={[searchedLocation.latitude, searchedLocation.longitude]}
          icon={searchMarkerIcon}
        >
          <Popup>{searchedLocation.label}</Popup>
        </Marker>
      )}
    </MapContainer>
  )
}
