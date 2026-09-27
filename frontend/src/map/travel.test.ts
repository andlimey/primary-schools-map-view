import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRoute, routeQueryKey } from './travel'

const FROM = { latitude: 1.3, longitude: 103.8 }
const TO = { latitude: 1.34, longitude: 103.9 }

function jsonResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(data) } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRoute', () => {
  it('builds the /api/route URL with from, to and mode', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ mode: 'walk', found: true, legs: [] }))

    await fetchRoute(FROM, TO, 'walk')

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('/api/route?')
    expect(url).toContain('from=1.3%2C103.8')
    expect(url).toContain('to=1.34%2C103.9')
    expect(url).toContain('mode=walk')
  })

  it('parses the JSON body', async () => {
    const payload = { mode: 'transit', found: true, transfers: 1, legs: [] }
    fetchMock.mockResolvedValue(jsonResponse(payload))
    await expect(fetchRoute(FROM, TO, 'transit')).resolves.toEqual(payload)
  })

  it('rejects on a non-OK response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 502))
    await expect(fetchRoute(FROM, TO, 'drive')).rejects.toThrow(/502/)
  })
})

describe('routeQueryKey', () => {
  it('is stable for the same inputs and varies by mode', () => {
    expect(routeQueryKey(FROM, TO, 'walk')).toEqual(routeQueryKey(FROM, TO, 'walk'))
    expect(routeQueryKey(FROM, TO, 'walk')).not.toEqual(routeQueryKey(FROM, TO, 'drive'))
  })
})
