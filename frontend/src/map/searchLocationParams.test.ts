import { describe, expect, it } from 'vitest'
import { parseSearchLocation, serializeSearchLocation, SEARCH_PARAM_KEYS } from './searchLocationParams'

const params = (init: Record<string, string>) => new URLSearchParams(init)

describe('parseSearchLocation', () => {
  it('parses valid params into a candidate', () => {
    expect(parseSearchLocation(params({ q: 'Tampines', lat: '1.35412', lng: '103.94451' }))).toEqual({
      label: 'Tampines',
      latitude: 1.35412,
      longitude: 103.94451,
    })
  })

  it('returns null when lat is missing', () => {
    expect(parseSearchLocation(params({ q: 'Tampines', lng: '103.9' }))).toBeNull()
  })

  it('returns null when lng is missing', () => {
    expect(parseSearchLocation(params({ q: 'Tampines', lat: '1.35' }))).toBeNull()
  })

  it('returns null when a coordinate is non-numeric', () => {
    expect(parseSearchLocation(params({ q: 'x', lat: 'abc', lng: '1' }))).toBeNull()
    expect(parseSearchLocation(params({ q: 'x', lat: '1', lng: '' }))).toBeNull()
  })

  it('returns null for a q-only (hand-written) URL', () => {
    expect(parseSearchLocation(params({ q: 'Somewhere' }))).toBeNull()
  })

  it('treats a missing q as an empty label', () => {
    expect(parseSearchLocation(params({ lat: '1.5', lng: '103.5' }))).toEqual({
      label: '',
      latitude: 1.5,
      longitude: 103.5,
    })
  })

  it('accepts coordinate 0', () => {
    expect(parseSearchLocation(params({ q: 'null island', lat: '0', lng: '0' }))).toEqual({
      label: 'null island',
      latitude: 0,
      longitude: 0,
    })
  })
})

describe('serializeSearchLocation', () => {
  it('rounds coordinates to 5 decimal places', () => {
    expect(
      serializeSearchLocation({ label: 'X', latitude: 1.354123456, longitude: 103.944509876 }),
    ).toEqual({ q: 'X', lat: '1.35412', lng: '103.94451' })
  })

  it('always emits all three keys', () => {
    const out = serializeSearchLocation({ label: '', latitude: 1, longitude: 2 })
    expect(Object.keys(out).sort()).toEqual([...SEARCH_PARAM_KEYS].sort())
  })

  it('round-trips through parseSearchLocation', () => {
    const original = { label: 'Bishan MRT', latitude: 1.35112, longitude: 103.84841 }
    const restored = parseSearchLocation(new URLSearchParams(serializeSearchLocation(original)))
    expect(restored).toEqual(original)
  })
})
