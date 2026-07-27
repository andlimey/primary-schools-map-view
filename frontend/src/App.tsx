import { useEffect, useState, type KeyboardEvent } from 'react'
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
const SEARCH_MIN_QUERY_LENGTH = 2
const SEARCH_DEBOUNCE_MS = 300
const SEARCH_RADIUS_METERS = 3000
const METERS_PER_DEGREE_LAT = 111_320

const searchMarkerIcon = L.divIcon({
  className: 'search-marker-icon',
  html: '<div class="search-marker-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
})

interface School {
  id: number
  slug: string | null
  name: string
  address: string
  latitude: number
  longitude: number
}

interface GeocodeCandidate {
  label: string
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

function PanToSearch({ location }: { location: GeocodeCandidate | null }) {
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

type SearchStatus = 'idle' | 'loading' | 'results' | 'no-results' | 'error'

function LocationSearch({ onSelect }: { onSelect: (candidate: GeocodeCandidate) => void }) {
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
      setCandidates([])
      setStatus('idle')
      setIsOpen(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      setStatus('loading')
      fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`Geocode request failed: ${res.status}`)
          return res.json() as Promise<GeocodeCandidate[]>
        })
        .then((results) => {
          setCandidates(results)
          setActiveIndex(-1)
          setStatus(results.length === 0 ? 'no-results' : 'results')
          setIsOpen(true)
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          console.error('Geocode search failed', err)
          setCandidates([])
          setStatus('error')
          setIsOpen(true)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  function selectCandidate(candidate: GeocodeCandidate) {
    onSelect(candidate)
    setQuery(candidate.label)
    setCandidates([])
    setStatus('idle')
    setIsOpen(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || candidates.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % candidates.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? candidates.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0) selectCandidate(candidates[activeIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className="location-search">
      <input
        type="text"
        className="location-search-input"
        placeholder="Search address or postal code"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => candidates.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 100)}
      />
      {isOpen && status === 'results' && (
        <ul className="location-search-results" role="listbox">
          {candidates.map((candidate, index) => (
            <li
              key={`${candidate.latitude}-${candidate.longitude}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'active' : ''}
              onMouseDown={() => selectCandidate(candidate)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {candidate.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && status === 'no-results' && <div className="location-search-message">No results found</div>}
      {isOpen && status === 'error' && (
        <div className="location-search-message location-search-error">Search failed. Please try again.</div>
      )}
    </div>
  )
}

export default function App() {
  const [schools, setSchools] = useState<School[]>([])
  const [searchedLocation, setSearchedLocation] = useState<GeocodeCandidate | null>(null)

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
      <LocationSearch onSelect={setSearchedLocation} />
      <FitToSchools schools={schools} />
      <PanToSearch location={searchedLocation} />
      {schools.map((school) => (
        <Marker key={school.id} position={[school.latitude, school.longitude]}>
          <Popup>
            <strong>{school.name}</strong>
            <br />
            {school.address}
          </Popup>
        </Marker>
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
