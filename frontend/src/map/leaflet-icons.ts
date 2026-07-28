import L from 'leaflet'

function pinIcon(fill: string) {
  return L.divIcon({
    className: 'pin-marker-icon',
    html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5s12.5-19.1 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${fill}" stroke="white" stroke-width="1.5"/>
      <circle cx="12.5" cy="12.5" r="5" fill="white"/>
    </svg>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -34],
  })
}

function dotIcon(modifierClass: string) {
  return L.divIcon({
    className: 'dot-marker-icon',
    html: `<div class="school-marker-dot ${modifierClass}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })
}

export const searchMarkerIcon = pinIcon('#e63946')

export const defaultSchoolIcon = dotIcon('school-marker-dot--default')
export const within1kmSchoolIcon = dotIcon('school-marker-dot--within-1km')
export const within2kmSchoolIcon = dotIcon('school-marker-dot--within-2km')
