import { describe, expect, it } from 'vitest'
import {
  BUS_COLOR,
  DRIVE_COLOR,
  RAIL_FALLBACK_COLOR,
  RAIL_LINE_COLORS,
  WALK_COLOR,
  casingStyle,
  legStyle,
} from './routeColors'
import type { RouteLeg } from './travel'

const leg = (mode: string, route: string | null = null): RouteLeg => ({ mode, route, path: [] })

describe('legStyle', () => {
  it('styles a walk route as a dotted light-blue line', () => {
    const s = legStyle(leg('WALK'))
    expect(s.color).toBe(WALK_COLOR)
    expect(s.dashArray).toBeTruthy()
  })

  it('styles a drive route as a solid blue line', () => {
    const s = legStyle(leg('DRIVE'))
    expect(s.color).toBe(DRIVE_COLOR)
    expect(s.dashArray).toBeUndefined()
  })

  it('styles a bus leg with the bus colour', () => {
    const s = legStyle(leg('BUS', '38'))
    expect(s.color).toBe(BUS_COLOR)
    expect(s.dashArray).toBeUndefined()
  })

  it('styles an MRT leg with its line colour', () => {
    expect(legStyle(leg('SUBWAY', 'EW')).color).toBe(RAIL_LINE_COLORS.EW)
    expect(legStyle(leg('SUBWAY', 'NS')).color).toBe(RAIL_LINE_COLORS.NS)
  })

  it('styles an LRT (TRAM) leg with its line colour', () => {
    expect(legStyle(leg('TRAM', 'BP')).color).toBe(RAIL_LINE_COLORS.BP)
  })

  it('falls back to a neutral colour for an unknown rail line, still styled', () => {
    const s = legStyle(leg('SUBWAY', 'ZZ'))
    expect(s.color).toBe(RAIL_FALLBACK_COLOR)
    expect(s.weight).toBeGreaterThan(0)
  })

  it('falls back for an unrecognised leg mode', () => {
    expect(legStyle(leg('FERRY', null)).color).toBe(RAIL_FALLBACK_COLOR)
  })
})

describe('casingStyle', () => {
  it('is white, wider, and keeps the dash pattern of the line it backs', () => {
    const s = legStyle(leg('WALK'))
    const casing = casingStyle(s)
    expect(casing.color).toBe('#ffffff')
    expect(casing.weight).toBeGreaterThan(s.weight)
    expect(casing.dashArray).toBe(s.dashArray)
  })
})
