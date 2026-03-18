import type {
  Coordinate,
  IChartApi,
  ISeriesApi,
  SeriesType,
  UTCTimestamp,
} from "lightweight-charts"
import { type FC, type MutableRefObject, useEffect, useRef, useState } from "react"

import { getSentimentColor } from "../price-chart/indicators"
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

interface OverlayPosition {
  x: Coordinate
  y: Coordinate
}

export const ChartOverlay: FC<ChartOverlayProps> = ({ chartRef, candlestickSeriesRef, bars }) => {
  const hoveredItem = useChartOverlayItem()
  const [position, setPosition] = useState<OverlayPosition | null>(null)
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

  // Resolve coordinates when debounced item changes
  useEffect(() => {
    if (!debouncedItem) {
      setPosition(null)
      return
    }

    const chart = chartRef.current
    const series = candlestickSeriesRef.current
    if (!chart || !series) return

    const bar = findNearestBar(bars, debouncedItem.timestamp)
    if (!bar) return

    const x = chart.timeScale().timeToCoordinate(bar.time as UTCTimestamp)
    // Y is at the current price (last bar's close), where the horizontal price line sits
    const lastBar = bars[bars.length - 1]
    const y = lastBar ? series.priceToCoordinate(lastBar.close) : null
    const container = chart.chartElement()

    // Only show if the candle is visible within the chart bounds
    if (x !== null && y !== null && container && x >= 0 && x <= container.clientWidth) {
      setPosition({ x, y })
    } else {
      setPosition(null)
    }
  }, [debouncedItem, bars, chartRef, candlestickSeriesRef])

  if (!position || !debouncedItem) return null

  // Determine dot color
  const dotColor =
    debouncedItem.type === "tweet"
      ? getSentimentColor(debouncedItem.tweet.sentiment)
      : debouncedItem.tx.transactionType === "StakeAdded"
        ? "#22c55e"
        : "#f93c41"

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* Vertical line spanning full chart height at the candle's time */}
      <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: position.x }} />

      {/* Colored dot at the intersection of vertical line and candle close price */}
      <div
        className="absolute size-[12px] rounded-full border-[#171717] border-[1.4px]"
        style={{
          left: position.x - 6,
          top: position.y - 6,
          backgroundColor: dotColor,
        }}
      />
    </div>
  )
}
