import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import './App.css'

// Leaflet's IconDefault._getIconUrl prepends an auto-detected imagePath in front of
// whatever iconUrl/shadowUrl resolve to, which mangles the bundler-hashed asset URLs
// below. Removing it falls back to the base Icon._getIconUrl, which returns the option as-is.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

const SINGAPORE_CENTER: [number, number] = [1.3521, 103.8198]
const DEFAULT_ZOOM = 11

interface School {
  id: number
  slug: string | null
  name: string
  address: string
  latitude: number
  longitude: number
}

function FitToSchools({ schools }: { schools: School[] }) {
  const map = useMap()

  useEffect(() => {
    if (schools.length === 0) return
    const bounds = L.latLngBounds(schools.map((school) => [school.latitude, school.longitude]))
    map.fitBounds(bounds, { padding: [24, 24] })
  }, [schools, map])

  return null
}

export default function App() {
  const [schools, setSchools] = useState<School[]>([])

  useEffect(() => {
    fetch('/api/schools')
      .then((res) => res.json())
      .then(setSchools)
      .catch((err) => console.error('Failed to load schools', err))
  }, [])

  return (
    <MapContainer center={SINGAPORE_CENTER} zoom={DEFAULT_ZOOM} className="map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToSchools schools={schools} />
      {schools.map((school) => (
        <Marker key={school.id} position={[school.latitude, school.longitude]}>
          <Popup>
            <strong>{school.name}</strong>
            <br />
            {school.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
