import type { ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * A stand-in for the Leaflet map instance returned by `useMap()`. Leaflet needs a
 * real layout engine, so in jsdom we mock `react-leaflet` at the module boundary
 * and hand components this stub instead. Tests assert on the `vi.fn()`s to check
 * which viewport calls fired.
 */
export const mapStub = {
  fitBounds: vi.fn(),
  setView: vi.fn(),
  panTo: vi.fn(),
  setZoom: vi.fn(),
}

export function resetMapStub() {
  mapStub.fitBounds.mockReset()
  mapStub.setView.mockReset()
  mapStub.panTo.mockReset()
  mapStub.setZoom.mockReset()
}

/**
 * Factory for `vi.mock('react-leaflet', ...)`. Renders the layout components as
 * plain elements so children still mount, and returns {@link mapStub} from
 * `useMap()`. Use via:
 *
 *   vi.mock('react-leaflet', async () => {
 *     const { makeReactLeafletMock } = await import('./test/react-leaflet-mock')
 *     return makeReactLeafletMock()
 *   })
 */
export function makeReactLeafletMock() {
  const Passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>

  return {
    MapContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="map-container">{children}</div>
    ),
    TileLayer: () => null,
    Marker: ({ children }: { children?: ReactNode }) => (
      <div data-testid="map-marker">{children}</div>
    ),
    Popup: Passthrough,
    Circle: () => <div data-testid="map-circle" />,
    useMap: () => mapStub,
  }
}
