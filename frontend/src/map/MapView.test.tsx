import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { MapView } from './MapView'
import { renderWithRouter } from '../test/renderWithRouter'

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
