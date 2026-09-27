import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  MODE_ICONS,
  MODE_LABELS,
  TRAVEL_MODES,
  routeStatusText,
  useRoute,
  type TravelMode,
} from './travel'
import type { LatLng } from './types'

interface TravelSectionProps {
  from: LatLng
  to: LatLng
  activeMode: TravelMode | null
  onToggleDraw: (mode: TravelMode) => void
}

export function TravelSection({ from, to, activeMode, onToggleDraw }: TravelSectionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto justify-start p-0 text-xs"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? '▾ Hide travel from your search' : '▸ Show travel from your search'}
      </Button>
      {expanded && (
        <div className="flex flex-col gap-0.5">
          {TRAVEL_MODES.map((mode) => (
            <TravelRow
              key={mode}
              from={from}
              to={to}
              mode={mode}
              active={activeMode === mode}
              onClick={() => onToggleDraw(mode)}
            />
          ))}
          <p className="text-muted-foreground mt-1 text-[0.7rem] leading-snug">
            Transit times for a typical school run (Mon 6:30am).
          </p>
        </div>
      )}
    </div>
  )
}

interface TravelRowProps {
  from: LatLng
  to: LatLng
  mode: TravelMode
  active: boolean
  onClick: () => void
}

function TravelRow({ from, to, mode, active, onClick }: TravelRowProps) {
  const status = routeStatusText(useRoute(from, to, mode))

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-baseline gap-1.5 rounded px-1.5 py-1 text-left text-xs',
        'hover:bg-muted focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        active && 'bg-muted font-medium',
      )}
    >
      <span aria-hidden className="text-sm leading-none">
        {MODE_ICONS[mode]}
      </span>
      <span className="w-12 shrink-0">{MODE_LABELS[mode]}</span>
      <span className="text-muted-foreground">{status}</span>
    </button>
  )
}
