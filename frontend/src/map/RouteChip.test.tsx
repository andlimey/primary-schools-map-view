import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouteChip } from './RouteChip'
import { useRoute, type RouteResult } from './travel'

vi.mock('./travel', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./travel')>()),
  useRoute: vi.fn(),
}))

const FROM = { latitude: 1.3, longitude: 103.8 }
const TO = { latitude: 1.34, longitude: 103.9, name: 'Rulang Primary' }

function stub(state: { data?: RouteResult; isLoading?: boolean; isError?: boolean }) {
  vi.mocked(useRoute).mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  } as ReturnType<typeof useRoute>)
}

const walkResult: RouteResult = {
  mode: 'walk',
  found: true,
  duration_seconds: 1080,
  distance_meters: 1400,
  transfers: null,
  walk_seconds: null,
  walk_only: false,
  legs: [],
}

beforeEach(() => stub({ data: walkResult }))
afterEach(() => vi.clearAllMocks())

describe('RouteChip', () => {
  it('shows the mode, school name and route summary', () => {
    render(<RouteChip from={FROM} to={TO} mode="walk" onDismiss={vi.fn()} />)
    expect(screen.getByText(/Walk to Rulang Primary/)).toBeInTheDocument()
    expect(screen.getByText('18 min · 1.4 km')).toBeInTheDocument()
  })

  it('shows an unavailable state when the route did not resolve', () => {
    stub({ data: { ...walkResult, found: false } })
    render(<RouteChip from={FROM} to={TO} mode="drive" onDismiss={vi.fn()} />)
    expect(screen.getByText('Route unavailable')).toBeInTheDocument()
  })

  it('calls onDismiss when the clear control is activated', async () => {
    const onDismiss = vi.fn()
    render(<RouteChip from={FROM} to={TO} mode="walk" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /clear route/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
