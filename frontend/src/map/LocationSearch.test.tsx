import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router-dom'
import { MapView } from './MapView'
import { renderWithRouter } from '../test/renderWithRouter'

vi.mock('react-leaflet', async () => {
  const { makeReactLeafletMock } = await import('../test/react-leaflet-mock')
  return makeReactLeafletMock()
})

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response
}

const CANDIDATE = { label: 'Tampines Avenue 4', latitude: 1.354123, longitude: 103.944509 }

beforeEach(() => {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/schools/admissions')) return Promise.resolve(jsonResponse({ year: null, schools: [] }))
    if (url.includes('/api/schools')) return Promise.resolve(jsonResponse([]))
    if (url.includes('/api/geocode')) return Promise.resolve(jsonResponse([CANDIDATE]))
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="search">{location.search}</div>
}

const renderMap = (initialEntries: string[]) =>
  renderWithRouter(
    <>
      <MapView />
      <LocationProbe />
    </>,
    { initialEntries },
  )

const input = () => screen.getByPlaceholderText(/Search address or postal code/)
const probe = () => screen.getByTestId('search')

describe('LocationSearch <-> URL', () => {
  it('seeds the input from ?q= only when the coordinates are valid', async () => {
    const { unmount } = renderMap(['/?q=Bishan&lat=1.351&lng=103.848'])
    expect(await screen.findByDisplayValue('Bishan')).toBeInTheDocument()
    unmount()

    renderMap(['/?q=Bishan&lat=oops'])
    await waitFor(() => expect(input()).toHaveValue(''))
  })

  it('writes q/lat/lng to the URL when a candidate is selected', async () => {
    const user = userEvent.setup()
    renderMap(['/'])

    await user.type(input(), 'Tampines')
    await user.click(await screen.findByRole('option', { name: CANDIDATE.label }))

    await waitFor(() => {
      const search = new URLSearchParams(probe().textContent ?? '')
      expect(search.get('q')).toBe(CANDIDATE.label)
      expect(search.get('lat')).toBe('1.35412')
      expect(search.get('lng')).toBe('103.94451')
    })
    expect(input()).toHaveValue(CANDIDATE.label)
  })

  it('hides the clear control when empty and shows it when there is text', async () => {
    const user = userEvent.setup()
    renderMap(['/'])

    await waitFor(() => expect(input()).toHaveValue(''))
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()

    await user.type(input(), 'ab')
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
  })

  it('clears the input and strips the URL params when the clear control is used', async () => {
    const user = userEvent.setup()
    renderMap(['/?q=Bishan&lat=1.351&lng=103.848'])

    await screen.findByDisplayValue('Bishan')
    await user.click(screen.getByRole('button', { name: /clear search/i }))

    await waitFor(() => expect(probe()).toHaveTextContent(''))
    expect(input()).toHaveValue('')
    const search = new URLSearchParams(probe().textContent ?? '')
    expect(search.get('lat')).toBeNull()
  })

  it('leaves the URL params in place when the text is deleted without the clear control', async () => {
    const user = userEvent.setup()
    renderMap(['/?q=Bishan&lat=1.351&lng=103.848'])

    await screen.findByDisplayValue('Bishan')
    await user.clear(input())

    expect(input()).toHaveValue('')
    const search = new URLSearchParams(probe().textContent ?? '')
    expect(search.get('lat')).toBe('1.351')
    expect(search.get('q')).toBe('Bishan')
  })
})
