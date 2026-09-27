import type { GeocodeCandidate } from './types'

/** URL hash query-string keys that encode the active map search. */
export const SEARCH_PARAM_KEYS = ['q', 'lat', 'lng'] as const

type SearchParamKey = (typeof SEARCH_PARAM_KEYS)[number]

const COORD_DECIMALS = 5

function parseCoord(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/**
 * Derive the active searched location from URL search params. Returns `null`
 * unless both `lat` and `lng` parse as finite numbers — a `q` on its own (e.g. a
 * hand-written URL) is ignored. A missing `q` yields an empty `label`.
 */
export function parseSearchLocation(params: URLSearchParams): GeocodeCandidate | null {
  const latitude = parseCoord(params.get('lat'))
  const longitude = parseCoord(params.get('lng'))
  if (latitude === null || longitude === null) return null
  return { label: params.get('q') ?? '', latitude, longitude }
}

export function roundCoord(value: number): string {
  // Number(...) drops any trailing zeros ("1.35" not "1.35000").
  return String(Number(value.toFixed(COORD_DECIMALS)))
}

/**
 * Serialise a searched location to the `q`/`lat`/`lng` params. Always emits all
 * three keys; coordinates are rounded to ~1m so shared URLs stay tidy.
 */
export function serializeSearchLocation(
  candidate: GeocodeCandidate,
): Record<SearchParamKey, string> {
  return {
    q: candidate.label,
    lat: roundCoord(candidate.latitude),
    lng: roundCoord(candidate.longitude),
  }
}
