import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
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
  value: TimePeriod
}

export const TIME_RANGES: TimeRangeOption[] = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
]
