import { XIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { MODE_ICONS, MODE_LABELS, routeStatusText, useRoute, type TravelMode } from './travel'
import type { LatLng } from './types'

interface RouteChipProps {
  from: LatLng
  to: LatLng & { name: string }
  mode: TravelMode
  onDismiss: () => void
}

/** Fixed-position summary for the route currently drawn on the map. Sits opposite the
 * DistanceLegend so the two don't overlap. Reads the same cached route the polylines use. */
export function RouteChip({ from, to, mode, onDismiss }: RouteChipProps) {
  const summary = routeStatusText(useRoute(from, to, mode))

  return (
    <div className="absolute right-2.5 bottom-2.5 z-[1000] max-w-[260px] font-sans">
      <Card size="sm" className="shadow-md">
        <CardContent className="flex items-start gap-2 text-xs">
          <span aria-hidden className="text-sm leading-none">
            {MODE_ICONS[mode]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {MODE_LABELS[mode]} to {to.name}
            </div>
            <div className="text-muted-foreground">{summary}</div>
          </div>
          <button
            type="button"
            aria-label="Clear route"
            className="text-muted-foreground hover:text-foreground -m-0.5 shrink-0 rounded-sm p-0.5"
            onClick={onDismiss}
          >
            <XIcon className="size-4" />
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
