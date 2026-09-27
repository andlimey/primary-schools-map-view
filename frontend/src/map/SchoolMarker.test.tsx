import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SchoolMarker } from './SchoolMarker'
import { renderWithRouter } from '../test/renderWithRouter'
import { useRoute, type RouteResult, type TravelMode } from './travel'
import type { School } from './types'

vi.mock('react-leaflet', async () => {
  const { makeReactLeafletMock } = await import('../test/react-leaflet-mock')
  return makeReactLeafletMock()
})

vi.mock('./travel', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./travel')>()),
  useRoute: vi.fn(),
}))

const SCHOOL: School = {
  id: 1,
  slug: 'admiralty',
  name: 'Admiralty Primary School',
  address: '11 Woodlands Circle',
  postal_code: '738907',
  latitude: 1.4426,
  longitude: 103.8,
}

const SEARCH = { label: 'Woodlands MRT', latitude: 1.437, longitude: 103.786 }

function walkResult(over: Partial<RouteResult> = {}): RouteResult {
  return {
    mode: 'walk',
    found: true,
    duration_seconds: 900,
    distance_meters: 1200,
    transfers: null,
    walk_seconds: null,
    walk_only: false,
    legs: [{ mode: 'WALK', route: null, path: [[1.437, 103.786], [1.4426, 103.8]] }],
    ...over,
  }
}

beforeEach(() => {
  vi.mocked(useRoute).mockImplementation(
    (_from, _to, mode: TravelMode) =>
      ({ data: walkResult({ mode }), isLoading: false, isError: false }) as ReturnType<
        typeof useRoute
      >,
  )
})

afterEach(() => vi.clearAllMocks())

/** Wrapper that owns `activeRouteMode` the way MapView does, so a row click flips it. */
function Harness({
  searchedLocation,
  onToggleSpy,
}: {
  searchedLocation: typeof SEARCH | null
  onToggleSpy?: (schoolId: number, mode: TravelMode) => void
}) {
  const [mode, setMode] = useState<TravelMode | null>(null)
  return (
    <SchoolMarker
      school={SCHOOL}
      admissionsById={new Map()}
      admissionsYear={null}
      admissionsLoading={false}
      distanceBand={null}
      searchedLocation={searchedLocation}
      activeRouteMode={mode}
      onToggleDraw={(id, m) => {
        onToggleSpy?.(id, m)
        setMode((cur) => (cur === m ? null : m))
      }}
      onMarkerRef={() => {}}
    />
  )
}

describe('SchoolMarker travel section', () => {
  it('has no travel section when no search location is active', () => {
    renderWithRouter(<Harness searchedLocation={null} />)
    expect(screen.queryByText(/Show travel/)).not.toBeInTheDocument()
  })

  it('shows the travel section when a search location is active', () => {
    renderWithRouter(<Harness searchedLocation={SEARCH} />)
    expect(screen.getByText(/Show travel from your search/)).toBeInTheDocument()
  })

  it('calls onToggleDraw with the school id when a mode row is clicked', async () => {
    const spy = vi.fn()
    renderWithRouter(<Harness searchedLocation={SEARCH} onToggleSpy={spy} />)
    await userEvent.click(screen.getByText(/Show travel/))
    await userEvent.click(screen.getByText('Walk'))

    expect(spy).toHaveBeenCalledWith(SCHOOL.id, 'walk')
  })

  it('marks the drawn mode as pressed', async () => {
    renderWithRouter(<Harness searchedLocation={SEARCH} />)
    await userEvent.click(screen.getByText(/Show travel/))
    await userEvent.click(screen.getByText('Walk'))

    expect(screen.getByText('Walk').closest('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
