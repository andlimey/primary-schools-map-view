import { Fragment, useMemo } from 'react'
import { Polyline } from 'react-leaflet'
import { casingStyle, legStyle } from './routeColors'
import { useRoute, type TravelMode } from './travel'
import type { LatLng } from './types'

interface RouteLayerProps {
  from: LatLng
  to: LatLng
  mode: TravelMode
}

/** Draws the resolved route for `mode` on the map. Each leg is two polylines — a white casing
 * beneath, then the coloured line — so it stays legible over the base tiles. Renders nothing
 * until the route has loaded, or if no route was found. */
export function RouteLayer({ from, to, mode }: RouteLayerProps) {
  const { data } = useRoute(from, to, mode)

  // Built once per route: react-leaflet re-styles a Polyline whenever `pathOptions` changes
  // identity, so fresh objects on every render would redraw every leg.
  const legs = useMemo(
    () =>
      data?.found
        ? data.legs.map((leg) => {
            const style = legStyle(leg)
            return {
              path: leg.path,
              line: { ...style, interactive: false },
              casing: { ...casingStyle(style), interactive: false },
            }
          })
        : [],
    [data],
  )

  return (
    <>
      {legs.map((leg, index) => (
        <Fragment key={index}>
          <Polyline positions={leg.path} pathOptions={leg.casing} />
          <Polyline positions={leg.path} pathOptions={leg.line} />
        </Fragment>
      ))}
    </>
  )
}
