import type { RouteLeg } from './travel'

// Singapore rail-line colours. Best-recollection of the official palette — reconcile against
// LTA branding / the rail-system Wikipedia infobox if they look off in the browser.
export const RAIL_LINE_COLORS: Record<string, string> = {
  NS: '#d42e12', // North South Line — red
  EW: '#009645', // East West Line — green
  CG: '#009645', // Changi Airport branch — part of the EW line
  NE: '#9900aa', // North East Line — purple
  CC: '#fa9e0d', // Circle Line — orange
  CE: '#fa9e0d', // Circle Line extension — orange
  DT: '#005ec4', // Downtown Line — blue
  TE: '#9d5b25', // Thomson–East Coast Line — brown
  JS: '#0099aa', // Jurong Region Line — teal (not yet operational)
  JW: '#0099aa',
  JE: '#0099aa',
  // LRT lines — all rendered grey
  BP: '#748477', // Bukit Panjang LRT
  SW: '#748477', // Sengkang LRT (west loop)
  SE: '#748477', // Sengkang LRT (east loop)
  STC: '#748477',
  PW: '#748477', // Punggol LRT (west loop)
  PE: '#748477', // Punggol LRT (east loop)
  PTC: '#748477',
}

/** Any rail leg whose line code isn't in the table above. */
export const RAIL_FALLBACK_COLOR = '#6b7280'

/** One colour for every bus, regardless of operator (OneMap gives us the service number, not
 * the operator). A deeper olive-lime — SBS Transit's identity, darkened for contrast against
 * OSM tiles (the lighter `#7cb342` washed out). */
export const BUS_COLOR = '#4d7c0f'

/** Walking — its own route, and the walk portions of a transit itinerary. Dotted styling
 * (not a lighter shade — `#60a5fa` washed out against tiles) reads as "approximate
 * connector, don't take literally". */
export const WALK_COLOR = '#1d4ed8'
export const WALK_DASH = '1 7'

/** Driving — solid, saturated blue. */
export const DRIVE_COLOR = '#2563eb'

export interface LegStyle {
  color: string
  weight: number
  dashArray?: string
}

const WALK_STYLE: LegStyle = { color: WALK_COLOR, weight: 4, dashArray: WALK_DASH }
const RIDE_WEIGHT = 5

/** Resolve the on-map style for one leg from its `mode` (and, for rail, its line code in
 * `route`). Walk and drive routes are a single `WALK` / `DRIVE` leg. */
export function legStyle(leg: RouteLeg): LegStyle {
  const mode = leg.mode.toUpperCase()
  if (mode === 'WALK') return WALK_STYLE
  if (mode === 'DRIVE') return { color: DRIVE_COLOR, weight: RIDE_WEIGHT }
  if (mode === 'BUS') return { color: BUS_COLOR, weight: RIDE_WEIGHT }
  if (mode === 'SUBWAY' || mode === 'TRAM' || mode === 'RAIL') {
    return { color: RAIL_LINE_COLORS[leg.route ?? ''] ?? RAIL_FALLBACK_COLOR, weight: RIDE_WEIGHT }
  }
  return { color: RAIL_FALLBACK_COLOR, weight: RIDE_WEIGHT }
}

/** The white outline drawn beneath a leg so it stays legible over the base tiles. */
export function casingStyle(style: LegStyle): LegStyle {
  return { color: '#ffffff', weight: style.weight + 3, dashArray: style.dashArray }
}
