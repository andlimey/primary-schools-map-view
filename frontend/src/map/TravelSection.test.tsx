import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TravelSection } from './TravelSection'
import { useRoute, type RouteResult, type TravelMode } from './travel'

vi.mock('./travel', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./travel')>()),
  useRoute: vi.fn(),
}))

const FROM = { latitude: 1.3, longitude: 103.8 }
const TO = { latitude: 1.34, longitude: 103.9 }

function result(mode: TravelMode, over: Partial<RouteResult> = {}): RouteResult {
  return {
    mode,
    found: true,
    duration_seconds: 900,
    distance_meters: 1200,
    transfers: null,
    walk_seconds: null,
    walk_only: false,
    legs: [],
    ...over,
  }
}

type RouteState = { data?: RouteResult; isLoading?: boolean; isError?: boolean }

function stubRoutes(byMode: Partial<Record<TravelMode, RouteState>>) {
  vi.mocked(useRoute).mockImplementation((_from, _to, mode) => {
    const s = byMode[mode] ?? {}
    return {
      data: s.data,
      isLoading: s.isLoading ?? false,
      isError: s.isError ?? false,
    } as ReturnType<typeof useRoute>
  })
}

beforeEach(() => {
  stubRoutes({
    walk: { data: result('walk') },
    transit: { data: result('transit', { distance_meters: null, transfers: 1, walk_seconds: 300 }) },
    drive: { data: result('drive', { duration_seconds: 420 }) },
  })
})

afterEach(() => vi.clearAllMocks())

const noop = () => {}

describe('TravelSection', () => {
  it('does not query routes while collapsed', () => {
    render(<TravelSection from={FROM} to={TO} activeMode={null} onToggleDraw={noop} />)
    expect(useRoute).not.toHaveBeenCalled()
  })

  it('shows three rows with data once expanded', async () => {
    render(<TravelSection from={FROM} to={TO} activeMode={null} onToggleDraw={noop} />)
    await userEvent.click(screen.getByText(/Show travel/))

    expect(screen.getByText('Walk')).toBeInTheDocument()
    expect(screen.getByText('Transit')).toBeInTheDocument()
    expect(screen.getByText('Drive')).toBeInTheDocument()
    expect(screen.getByText(/15 min · 1\.2 km/)).toBeInTheDocument()
    expect(screen.getByText(/1 transfer/)).toBeInTheDocument()
    expect(screen.getByText(/incl\. 5 min walk/)).toBeInTheDocument()
  })

  it('shows an inline error for one failing mode without affecting the others', async () => {
    stubRoutes({
      walk: { data: result('walk') },
      transit: { isError: true },
      drive: { data: result('drive') },
    })
    render(<TravelSection from={FROM} to={TO} activeMode={null} onToggleDraw={noop} />)
    await userEvent.click(screen.getByText(/Show travel/))

    expect(screen.getByText('Route unavailable')).toBeInTheDocument()
    expect(screen.getAllByText(/min · .*km/).length).toBe(2)
  })

  it('renders a walk-only transit itinerary as a walking trip', async () => {
    stubRoutes({
      walk: { data: result('walk') },
      transit: { data: result('transit', { walk_only: true, duration_seconds: 480, distance_meters: null }) },
      drive: { data: result('drive') },
    })
    render(<TravelSection from={FROM} to={TO} activeMode={null} onToggleDraw={noop} />)
    await userEvent.click(screen.getByText(/Show travel/))

    expect(screen.getByText(/no bus needed/)).toBeInTheDocument()
  })

  it('fires onToggleDraw when a row is clicked', async () => {
    const onToggleDraw = vi.fn()
    render(<TravelSection from={FROM} to={TO} activeMode={null} onToggleDraw={onToggleDraw} />)
    await userEvent.click(screen.getByText(/Show travel/))
    await userEvent.click(screen.getByText('Walk'))

    expect(onToggleDraw).toHaveBeenCalledWith('walk')
  })

  it('marks the drawn mode row as pressed', async () => {
    render(<TravelSection from={FROM} to={TO} activeMode="drive" onToggleDraw={noop} />)
    await userEvent.click(screen.getByText(/Show travel/))

    expect(screen.getByText('Drive').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Walk').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })
})
