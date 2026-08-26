import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { AdmissionPhaseHistoryEntry } from './types'
import { buildTrendData, computeYAxisTicks, formatRatio } from './admissionTrend'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function TrendTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border-border rounded-md border px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground mb-1 font-medium">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span className="h-0.5 w-3 shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium">
              {typeof entry.value === 'number' ? formatRatio(entry.value) : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdmissionTrendChart({ phases }: { phases: AdmissionPhaseHistoryEntry[] }) {
  const { phaseColumns, data } = useMemo(() => buildTrendData(phases), [phases])
  const [hiddenPhases, setHiddenPhases] = useState<Set<string>>(new Set())

  const yTicks = useMemo(() => {
    const maxRatio = data.reduce((max, point) => {
      for (const col of phaseColumns) {
        const value = point[col.phaseCode]
        if (typeof value === 'number' && value > max) max = value
      }
      return max
    }, 1)
    return computeYAxisTicks(maxRatio)
  }, [data, phaseColumns])

  function togglePhase(phaseCode: string) {
    setHiddenPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseCode)) {
        next.delete(phaseCode)
      } else {
        next.add(phaseCode)
      }
      return next
    })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {phaseColumns.map((col) => {
            const isActive = !hiddenPhases.has(col.phaseCode)
            return (
              <button
                key={col.phaseCode}
                type="button"
                onClick={() => togglePhase(col.phaseCode)}
                aria-pressed={isActive}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  isActive ? 'border-border bg-card' : 'border-border/60 text-muted-foreground bg-transparent'
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: isActive ? col.color : 'transparent',
                    border: `1.5px solid ${col.color}`,
                  }}
                />
                {col.label}
              </button>
            )
          })}
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="year"
                type="category"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, yTicks[yTicks.length - 1]]}
                ticks={yTicks}
                tickFormatter={formatRatio}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <ReferenceLine
                y={1}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{ value: '1x', position: 'right', fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <Tooltip content={TrendTooltip} cursor={{ stroke: 'var(--border)' }} />
              {phaseColumns.map(
                (col) =>
                  !hiddenPhases.has(col.phaseCode) && (
                    <Line
                      key={col.phaseCode}
                      type="monotone"
                      dataKey={col.phaseCode}
                      name={col.label}
                      stroke={col.color}
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)', fill: col.color }}
                      activeDot={{ r: 5, fill: col.color, stroke: 'var(--card)', strokeWidth: 2 }}
                      connectNulls={false}
                    />
                  )
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
