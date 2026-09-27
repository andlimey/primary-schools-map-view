import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapView } from './MapView'
import { renderWithRouter } from '../test/renderWithRouter'
import { markerStub, resetMarkerStub } from '../test/react-leaflet-mock'

vi.mock('react-leaflet', async () => {
  const { makeReactLeafletMock } = await import('../test/react-leaflet-mock')
  return makeReactLeafletMock()
})

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/schools/admissions')) return Promise.resolve(jsonResponse({ year: null, schools: [] }))
    if (url.includes('/api/schools')) return Promise.resolve(jsonResponse([]))
    if (url.includes('/api/geocode')) return Promise.resolve(jsonResponse([]))
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const geocodeCalled = () =>
  fetchMock.mock.calls.some(([input]) => String(input).includes('/api/geocode'))

describe('MapView URL-driven search', () => {
  it('restores the full search context from a valid URL without geocoding', async () => {
    renderWithRouter(<MapView />, {
      initialEntries: ['/?q=Tampines&lat=1.35412&lng=103.94451'],
    })

    // search marker popup shows the label
    expect(await screen.findByText('Tampines')).toBeInTheDocument()
    // 1km + 2km circles
    expect(screen.getAllByTestId('map-circle')).toHaveLength(2)
    // legend
    expect(screen.getByText(/Straight-line distance estimate/)).toBeInTheDocument()
    // search box seeded from ?q=
    expect(screen.getByPlaceholderText(/Search address or postal code/)).toHaveValue('Tampines')
    // no geocoding round trip
    expect(geocodeCalled()).toBe(false)
  })

  it('shows the default view when the URL carries no search', async () => {
    renderWithRouter(<MapView />, { initialEntries: ['/'] })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByTestId('map-circle')).not.toBeInTheDocument()
    expect(screen.queryByText(/Straight-line distance estimate/)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search address or postal code/)).toHaveValue('')
  })

  it('ignores a search with malformed coordinates', async () => {
    renderWithRouter(<MapView />, { initialEntries: ['/?q=x&lat=abc&lng=1'] })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(screen.queryByTestId('map-circle')).not.toBeInTheDocument()
    expect(screen.queryByText(/Straight-line distance estimate/)).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search address or postal code/)).toHaveValue('')
    expect(geocodeCalled()).toBe(false)
  })
})

describe('MapView route drawing', () => {
  const SCHOOL = {
    id: 7,
    slug: 'rulang',
    name: 'Rulang Primary School',
    address: '1 Jurong West St 32',
    postal_code: '640405',
    latitude: 1.3446,
    longitude: 103.7196,
  }
  const ROUTE = {
    mode: 'walk',
    found: true,
    duration_seconds: 900,
    distance_meters: 1200,
    transfers: null,
    walk_seconds: null,
    walk_only: false,
    legs: [{ mode: 'WALK', route: null, path: [[1.35, 103.94], [1.3446, 103.7196]] }],
  }

  beforeEach(() => {
    resetMarkerStub()
    fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/schools/admissions')) return Promise.resolve(jsonResponse({ year: null, schools: [] }))
      if (url.includes('/api/schools')) return Promise.resolve(jsonResponse([SCHOOL]))
      if (url.includes('/api/route')) return Promise.resolve(jsonResponse({ ...ROUTE, mode: new URL(url, 'http://x').searchParams.get('mode') }))
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  async function openTravelAndDraw() {
    renderWithRouter(<MapView />, { initialEntries: ['/?q=Tampines&lat=1.35412&lng=103.94451'] })
    await userEvent.click(await screen.findByText(/Show travel from your search/))
    await userEvent.click(await screen.findByText('Walk'))
  }

  it('draws the route, closes the popup and shows a corner chip when a mode is selected', async () => {
    await openTravelAndDraw()
    const lines = await screen.findAllByTestId('map-polyline')
    expect(lines).toHaveLength(2) // casing + coloured line
    expect(JSON.parse(lines[0].getAttribute('data-positions')!)).toEqual(ROUTE.legs[0].path)
    expect(markerStub.closePopup).toHaveBeenCalled()
    expect(await screen.findByText(/Walk to Rulang Primary School/)).toBeInTheDocument()
  })

  it('clears the route when the same mode is selected again', async () => {
    await openTravelAndDraw()
    await screen.findAllByTestId('map-polyline')
    await userEvent.click(screen.getByText('Walk'))
    expect(screen.queryAllByTestId('map-polyline')).toHaveLength(0)
  })

  it('clears the route when the chip is dismissed', async () => {
    await openTravelAndDraw()
    await userEvent.click(await screen.findByRole('button', { name: /clear route/i }))
    expect(screen.queryAllByTestId('map-polyline')).toHaveLength(0)
    expect(screen.queryByText(/Walk to Rulang Primary School/)).not.toBeInTheDocument()
  })

  it('reopens the school popup when the chip is dismissed', async () => {
    await openTravelAndDraw()
    expect(markerStub.openPopup).not.toHaveBeenCalled()

    await userEvent.click(await screen.findByRole('button', { name: /clear route/i }))

    expect(markerStub.openPopup).toHaveBeenCalledTimes(1)
  })
})
