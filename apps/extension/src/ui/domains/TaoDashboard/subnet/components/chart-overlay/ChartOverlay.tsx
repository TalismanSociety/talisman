import type {
  Coordinate,
  IChartApi,
  ISeriesApi,
  SeriesType,
  UTCTimestamp,
} from "lightweight-charts"
import { type FC, type MutableRefObject, useCallback, useEffect, useRef, useState } from "react"

import type { OhlcvBar } from "../price-chart/types"
import { useChartOverlayItem } from "./ChartOverlayContext"

type ChartApi = IChartApi
type SeriesApi = ISeriesApi<SeriesType>

interface ChartOverlayProps {
  chartRef: MutableRefObject<ChartApi | null>
  candlestickSeriesRef: MutableRefObject<SeriesApi | null>
  bars: OhlcvBar[]
}

/** Find the bar whose `time` is closest to `target` via binary search. */
function findNearestBar(bars: OhlcvBar[], target: number): OhlcvBar | null {
  if (bars.length === 0) return null

  let lo = 0
  let hi = bars.length - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (bars[mid].time < target) lo = mid + 1
    else hi = mid
  }

  if (lo === 0) return bars[0]
  const prev = bars[lo - 1]
  const curr = bars[lo]
  return Math.abs(prev.time - target) <= Math.abs(curr.time - target) ? prev : curr
}

export const ChartOverlay: FC<ChartOverlayProps> = ({ chartRef, bars }) => {
  const hoveredItem = useChartOverlayItem()
  const [xPos, setXPos] = useState<Coordinate | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedItem, setDebouncedItem] = useState(hoveredItem)

  // Debounce: delay showing overlay by 100ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!hoveredItem) {
      setDebouncedItem(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedItem(hoveredItem)
    }, 100)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [hoveredItem])

  const resolvePosition = useCallback(() => {
    if (!debouncedItem) {
      setXPos(null)
      return
    }

    const chart = chartRef.current
    if (!chart) return

    const bar = findNearestBar(bars, debouncedItem.timestamp)
    if (!bar) return

    const x = chart.timeScale().timeToCoordinate(bar.time as UTCTimestamp)
    const container = chart.chartElement()

    if (x !== null && container && x >= 0 && x <= container.clientWidth) {
      setXPos(x)
    } else {
      setXPos(null)
    }
  }, [debouncedItem, bars, chartRef])

  // Resolve coordinates when debounced item changes, and re-resolve on chart scroll/zoom
  useEffect(() => {
    resolvePosition()

    const chart = chartRef.current
    if (!chart) return

    const onRangeChange = () => resolvePosition()
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange)

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange)
    }
  }, [resolvePosition, chartRef])

  if (xPos === null || !debouncedItem) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: xPos }} />
    </div>
  )
}
