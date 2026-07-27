import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Leaflet's IconDefault._getIconUrl prepends an auto-detected imagePath in front of
// whatever iconUrl/shadowUrl resolve to, which mangles the bundler-hashed asset URLs
// below. Removing it falls back to the base Icon._getIconUrl, which returns the option as-is.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

export const searchMarkerIcon = L.divIcon({
  className: 'search-marker-icon',
  html: '<div class="search-marker-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
})
