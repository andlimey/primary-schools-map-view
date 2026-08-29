import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { SchoolDetailPage } from './SchoolDetailPage'
import { renderWithRouter } from '../test/renderWithRouter'

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateSpy }
})

function jsonResponse(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data) } as Response
}

beforeEach(() => {
  navigateSpy.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/schools')) return Promise.resolve(jsonResponse([]))
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    }),
  )
})

afterEach(() => vi.unstubAllGlobals())

const renderDetail = () =>
  renderWithRouter(
    <Routes>
      <Route path="/schools/:slug" element={<SchoolDetailPage />} />
    </Routes>,
    { initialEntries: ['/schools/unknown-school'] },
  )

describe('SchoolDetailPage "Back to map"', () => {
  it('pops history when the page was reached in-app', async () => {
    window.history.replaceState({ idx: 3 }, '')
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: /back to map/i }))
    expect(navigateSpy).toHaveBeenCalledWith(-1)
  })

  it('navigates to the map default view on a direct visit', async () => {
    window.history.replaceState(null, '')
    renderDetail()

    await userEvent.click(await screen.findByRole('button', { name: /back to map/i }))
    expect(navigateSpy).toHaveBeenCalledWith('/')
  })

  it('does not carry any search/query params on the detail URL', async () => {
    window.history.replaceState({ idx: 1 }, '')
    renderDetail()

    await screen.findByRole('button', { name: /back to map/i })
    expect(window.location.search).toBe('')
  })
})
