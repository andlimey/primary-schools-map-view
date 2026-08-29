import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'

interface Options {
  /** Initial history entries for the MemoryRouter (e.g. ['/?q=x&lat=1&lng=2']). */
  initialEntries?: string[]
  /** Index into initialEntries to start at. */
  initialIndex?: number
}

/**
 * Render a component inside the same providers `App` supplies (router, react-query,
 * tooltips), but with a `MemoryRouter` whose URL the test controls. React Query
 * retries are disabled so failed fetch mocks surface immediately.
 */
export function renderWithRouter(ui: ReactElement, { initialEntries = ['/'], initialIndex }: Options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
          {children}
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )

  return { queryClient, ...render(ui, { wrapper }) }
}
