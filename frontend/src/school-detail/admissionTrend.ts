import type { AdmissionPhaseHistoryEntry } from './types'

// Fixed categorical order (never cycled per-render) so a phase keeps the same
// hue across toggles; first slots are the ones validated for CVD-safe adjacency.
export const PHASE_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

export interface TrendPhaseColumn {
  phaseCode: string
  label: string
  color: string
}

export interface TrendDataPoint {
  year: number
  [phaseCode: string]: number
}

export function buildTrendData(phases: AdmissionPhaseHistoryEntry[]): {
  phaseColumns: TrendPhaseColumn[]
  data: TrendDataPoint[]
} {
  const years = [...new Set(phases.map((phase) => phase.year))].sort((a, b) => a - b)

  // Same convention as MultiYearAdmissionsTable's buildTable: walk newest-year-first so
  // each phase's column reflects its most recent label, and retired phases still get a column.
  const phaseOrder: string[] = []
  const phaseLabelByCode = new Map<string, string>()
  for (const phase of [...phases].sort((a, b) => b.year - a.year)) {
    if (!phaseLabelByCode.has(phase.phase_code)) {
      phaseLabelByCode.set(phase.phase_code, phase.phase_label)
      phaseOrder.push(phase.phase_code)
    }
  }
  const phaseColumns = phaseOrder.map((code, index) => ({
    phaseCode: code,
    label: phaseLabelByCode.get(code)!,
    color: PHASE_COLORS[index % PHASE_COLORS.length],
  }))

  const ratioByYearAndPhase = new Map<number, Map<string, number>>()
  for (const phase of phases) {
    if (phase.vacancy == null || phase.vacancy <= 0 || phase.applied == null) continue
    let yearRatios = ratioByYearAndPhase.get(phase.year)
    if (!yearRatios) {
      yearRatios = new Map()
      ratioByYearAndPhase.set(phase.year, yearRatios)
    }
    yearRatios.set(phase.phase_code, phase.applied / phase.vacancy)
  }

  const data = years.map((year) => {
    const point: TrendDataPoint = { year }
    const yearRatios = ratioByYearAndPhase.get(year)
    if (yearRatios) {
      for (const [phaseCode, ratio] of yearRatios) {
        point[phaseCode] = ratio
      }
    }
    return point
  })

  return { phaseColumns, data }
}

export function formatRatio(value: number): string {
  return Number.isInteger(value) ? `${value}x` : `${value.toFixed(1)}x`
}

// Recharts' auto ticks land on whatever the raw data max happens to be (e.g. 6.58x);
// round that up to a "nice" step so the axis reads 0x/2x/4x/6x instead.
export function computeYAxisTicks(maxRatio: number): number[] {
  const target = Math.max(maxRatio, 1) * 1.1
  const rawStep = target / 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  const step = niceNormalized * magnitude
  const maxTick = Math.ceil(target / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= maxTick + step / 2; value += step) {
    ticks.push(Math.round(value * 100) / 100)
  }
  return ticks
}
