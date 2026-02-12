import type { UTCTimestamp } from "lightweight-charts"

export interface FlowChartPoint {
  time: UTCTimestamp
  value: number
}

export interface FlowTotals {
  taoIn: number
  taoOut: number
  net: number
}

export interface AlphaFlow {
  alphaIn: number
  alphaOut: number
}

export interface TimeRangeOption {
  label: string
  value: number
}

export const TIME_RANGES: TimeRangeOption[] = [
  { label: "1D", value: 1 },
  { label: "1W", value: 7 },
  { label: "1M", value: 30 },
]
