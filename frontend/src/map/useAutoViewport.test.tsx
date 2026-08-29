import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAutoViewport } from './useAutoViewport'
import type { GeocodeCandidate, School } from './types'
import { mapStub, resetMapStub } from '../test/react-leaflet-mock'

vi.mock('react-leaflet', async () => {
  const { makeReactLeafletMock } = await import('../test/react-leaflet-mock')
  return makeReactLeafletMock()
})

const school = (id: number, latitude: number, longitude: number): School => ({
  id,
  slug: `s-${id}`,
  name: `School ${id}`,
  address: 'somewhere',
  postal_code: null,
  latitude,
  longitude,
})

const SCHOOLS = [school(1, 1, 2), school(3, 3, 4)]
const SCHOOLS_BOUNDS = [
  [1, 2],
  [3, 4],
]

const LOCATION: GeocodeCandidate = { label: 'Somewhere', latitude: 1.35, longitude: 103.9 }

type Props = { schools: School[]; searchedLocation: GeocodeCandidate | null }
const setup = (initialProps: Props) =>
  renderHook((props: Props) => useAutoViewport(props), { initialProps })

beforeEach(resetMapStub)

describe('useAutoViewport', () => {
  it('fits to the schools extent once when no search is active', () => {
    const { rerender } = setup({ schools: [], searchedLocation: null })
    expect(mapStub.fitBounds).not.toHaveBeenCalled()

    rerender({ schools: SCHOOLS, searchedLocation: null })
    expect(mapStub.fitBounds).toHaveBeenCalledTimes(1)
    expect(mapStub.fitBounds).toHaveBeenCalledWith(SCHOOLS_BOUNDS, { padding: [24, 24] })
  })

  it('does not re-fit on a re-render with the same schools', () => {
    const { rerender } = setup({ schools: SCHOOLS, searchedLocation: null })
    expect(mapStub.fitBounds).toHaveBeenCalledTimes(1)

    rerender({ schools: SCHOOLS, searchedLocation: null })
    expect(mapStub.fitBounds).toHaveBeenCalledTimes(1)
  })

  it('frames the search location and never the schools extent when a search is active', () => {
    setup({ schools: SCHOOLS, searchedLocation: LOCATION })
    expect(mapStub.fitBounds).toHaveBeenCalledTimes(1)
    const [bounds, options] = mapStub.fitBounds.mock.calls[0]
    // search branch passes bounds only, no padding options
    expect(options).toBeUndefined()
    expect(bounds).not.toEqual(SCHOOLS_BOUNDS)
    expect(bounds[0][0]).toBeCloseTo(LOCATION.latitude - 2100 / 111320, 4)
  })

  it('does not snap back to the schools extent when the search is cleared', () => {
    const { rerender } = setup({ schools: SCHOOLS, searchedLocation: LOCATION })
    expect(mapStub.fitBounds).toHaveBeenCalledTimes(1)

    rerender({ schools: SCHOOLS, searchedLocation: null })
    expect(mapStub.fitBounds).toHaveBeenCalledTimes(1)
  })
})
