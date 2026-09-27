import { useQuery } from '@tanstack/react-query'
import { roundCoord } from './searchLocationParams'
import type { LatLng } from './types'

export type TravelMode = 'walk' | 'transit' | 'drive'

export const TRAVEL_MODES: TravelMode[] = ['walk', 'transit', 'drive']

export const MODE_LABELS: Record<TravelMode, string> = {
  walk: 'Walk',
  transit: 'Transit',
  drive: 'Drive',
}

/** Emoji marker shown next to each mode row. */
export const MODE_ICONS: Record<TravelMode, string> = {
  walk: '🚶',
  transit: '🚌',
  drive: '🚗',
}

export interface RouteLeg {
  mode: string
  route: string | null
  /** Ordered [lat, lng] pairs tracing this leg. */
  path: [number, number][]
}

export interface RouteResult {
  mode: TravelMode
  found: boolean
  duration_seconds: number | null
  distance_meters: number | null
  transfers: number | null
  walk_seconds: number | null
  walk_only: boolean
  legs: RouteLeg[]
}

function coordParam({ latitude, longitude }: LatLng): string {
  // Rounded to the same ~1 m precision the server keys its cache on, so float noise can't
  // split one location into separate query-cache entries.
  return `${roundCoord(latitude)},${roundCoord(longitude)}`
}

export function fetchRoute(from: LatLng, to: LatLng, mode: TravelMode): Promise<RouteResult> {
  const params = new URLSearchParams({
    from: coordParam(from),
    to: coordParam(to),
    mode,
  })
  return fetch(`/api/route?${params}`).then((res) => {
    if (!res.ok) throw new Error(`Route request failed: ${res.status}`)
    return res.json() as Promise<RouteResult>
  })
}

export function routeQueryKey(from: LatLng, to: LatLng, mode: TravelMode) {
  return ['route', coordParam(from), coordParam(to), mode] as const
}

// The server plans transit for a fixed weekly time and caches every route for a week, so
// there is nothing to gain from refetching within a browsing session.
const ROUTE_STALE_TIME_MS = 60 * 60_000

export function useRoute(from: LatLng, to: LatLng, mode: TravelMode) {
  return useQuery({
    queryKey: routeQueryKey(from, to, mode),
    queryFn: () => fetchRoute(from, to, mode),
    staleTime: ROUTE_STALE_TIME_MS,
    // Keep routes cached after the popup / chip unmounts, so reopening a school doesn't refetch.
    gcTime: ROUTE_STALE_TIME_MS,
  })
}

// --- formatting helpers (shared by the popup rows and the corner route chip) ---

/** Status line for a route query: loading, unavailable, or the route summary. */
export function routeStatusText({
  data,
  isLoading,
  isError,
}: {
  data?: RouteResult
  isLoading: boolean
  isError: boolean
}): string {
  if (isLoading) return 'Loading…'
  if (isError || !data || !data.found) return 'Route unavailable'
  return describeRoute(data)
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const minutes = Math.round(seconds / 60)
  return minutes < 1 ? '<1 min' : `${minutes} min`
}

export function formatDistance(meters: number | null): string {
  if (meters == null) return ''
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatTransfers(transfers: number | null): string {
  if (transfers == null || transfers === 0) return 'direct'
  return transfers === 1 ? '1 transfer' : `${transfers} transfers`
}

/** One-line summary of a resolved route, duration always first, e.g. "18 min · 1.4 km" or
 * "22 min · 1 transfer · incl. 6 min walk". */
export function describeRoute(route: RouteResult): string {
  if (route.mode === 'transit') {
    if (route.walk_only) {
      return `Walk — ${formatDuration(route.duration_seconds)} (no bus needed)`
    }
    const parts = [formatDuration(route.duration_seconds), formatTransfers(route.transfers)]
    if (route.walk_seconds != null) parts.push(`incl. ${formatDuration(route.walk_seconds)} walk`)
    return parts.join(' · ')
  }
  return [formatDuration(route.duration_seconds), formatDistance(route.distance_meters)]
    .filter(Boolean)
    .join(' · ')
}
