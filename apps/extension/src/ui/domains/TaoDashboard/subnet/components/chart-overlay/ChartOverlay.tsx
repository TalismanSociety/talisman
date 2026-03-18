import type {
  Coordinate,
  IChartApi,
  ISeriesApi,
  LogicalRange,
  SeriesType,
  UTCTimestamp,
} from "lightweight-charts"
import { type FC, type MutableRefObject, useEffect, useRef, useState } from "react"

import { getSentimentColor } from "../price-chart/indicators"
import type { OhlcvBar } from "../price-chart/types"
import { useChartOverlayItem } from "./ChartOverlayContext"
import { TweetOverlayCard } from "./TweetOverlayCard"
import { WhaleOverlayCard } from "./WhaleOverlayCard"

type ChartApi = IChartApi
type SeriesApi = ISeriesApi<SeriesType>

interface ChartOverlayProps {
  chartRef: MutableRefObject<ChartApi | null>
  candlestickSeriesRef: MutableRefObject<SeriesApi | null>
  bars: OhlcvBar[]
}

/** Find the bar whose `time` is closest to `target` via binary search. Returns bar and its index. */
function findNearestBar(bars: OhlcvBar[], target: number): { bar: OhlcvBar; index: number } | null {
  if (bars.length === 0) return null

  let lo = 0
  let hi = bars.length - 1

  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (bars[mid].time < target) lo = mid + 1
    else hi = mid
  }

  // lo is the first bar >= target. Compare it with the previous bar to find closest.
  if (lo === 0) return { bar: bars[0], index: 0 }
  const prev = bars[lo - 1]
  const curr = bars[lo]
  if (Math.abs(prev.time - target) <= Math.abs(curr.time - target)) {
    return { bar: prev, index: lo - 1 }
  }
  return { bar: curr, index: lo }
}

interface OverlayPosition {
  x: Coordinate
  y: Coordinate
  containerWidth: number
  containerHeight: number
}

export const ChartOverlay: FC<ChartOverlayProps> = ({ chartRef, candlestickSeriesRef, bars }) => {
  const hoveredItem = useChartOverlayItem()
  const [position, setPosition] = useState<OverlayPosition | null>(null)
  const [snappedBar, setSnappedBar] = useState<OhlcvBar | null>(null)
  const savedRangeRef = useRef<LogicalRange | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
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

  // Restore chart position when hover ends
  useEffect(() => {
    if (!hoveredItem && savedRangeRef.current) {
      const chart = chartRef.current
      if (chart) {
        chart.timeScale().setVisibleLogicalRange(savedRangeRef.current)
      }
      savedRangeRef.current = null
    }
  }, [hoveredItem, chartRef])

  // Resolve coordinates when debounced item changes
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    if (!debouncedItem) {
      setPosition(null)
      setSnappedBar(null)
      return
    }

    const chart = chartRef.current
    const series = candlestickSeriesRef.current
    if (!chart || !series) return

    const result = findNearestBar(bars, debouncedItem.timestamp)
    if (!result) return
    const { bar, index: barIndex } = result
    setSnappedBar(bar)

    const resolveCoordinates = () => {
      const x = chart.timeScale().timeToCoordinate(bar.time as UTCTimestamp)
      const y = series.priceToCoordinate(bar.close)
      const container = chart.chartElement()

      // Check if candle is actually visible within the container bounds
      // timeToCoordinate returns valid coordinates (negative or > width) for off-screen candles,
      // it only returns null if the time doesn't exist in the data at all
      const isVisible =
        x !== null && y !== null && container && x >= 0 && x <= container.clientWidth

      if (isVisible) {
        const rect = container.getBoundingClientRect()
        setPosition({ x, y, containerWidth: rect.width, containerHeight: rect.height })
        return
      }

      // Candle is off-screen — auto-scroll
      if (!savedRangeRef.current) {
        savedRangeRef.current = chart.timeScale().getVisibleLogicalRange()
      }

      const visibleSpan = 50
      chart.timeScale().setVisibleLogicalRange({
        from: barIndex - Math.floor(visibleSpan / 2),
        to: barIndex + Math.floor(visibleSpan / 2),
      })

      // Re-read coordinates after scroll settles
      rafRef.current = requestAnimationFrame(() => {
        const x2 = chart.timeScale().timeToCoordinate(bar.time as UTCTimestamp)
        const y2 = series.priceToCoordinate(bar.close)
        const container2 = chart.chartElement()
        if (x2 !== null && y2 !== null && container2) {
          const rect = container2.getBoundingClientRect()
          setPosition({ x: x2, y: y2, containerWidth: rect.width, containerHeight: rect.height })
        }
      })
    }

    resolveCoordinates()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [debouncedItem, bars, chartRef, candlestickSeriesRef])

  if (!position || !debouncedItem || !snappedBar) return null

  // Determine dot color
  const dotColor =
    debouncedItem.type === "tweet"
      ? getSentimentColor(debouncedItem.tweet.sentiment)
      : debouncedItem.tx.transactionType === "StakeAdded"
        ? "#22c55e"
        : "#f93c41"

  // Card positioning: offset to the side with more space
  const CARD_WIDTH = 188
  const CARD_GAP = 16
  const placeLeft = position.x + CARD_WIDTH + CARD_GAP > position.containerWidth
  const cardX = placeLeft ? position.x - CARD_WIDTH - CARD_GAP : position.x + CARD_GAP
  // Vertically center card, clamped to container bounds
  const cardHeight = debouncedItem.type === "tweet" ? 120 : 140
  const cardY = Math.max(
    8,
    Math.min(position.containerHeight - cardHeight - 8, position.y - cardHeight / 2)
  )

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* Vertical dashed line */}
      <div
        className="absolute top-0 bottom-0 border-white/28 border-l border-dashed"
        style={{ left: position.x }}
      />

      {/* Colored dot */}
      <div
        className="absolute size-[12px] rounded-full border-[#171717] border-[1.4px]"
        style={{
          left: position.x - 6,
          top: position.y - 6,
          backgroundColor: dotColor,
        }}
      />

      {/* Glassmorphism card */}
      <div
        className="pointer-events-auto absolute w-[188px] rounded-[6px] border border-white/47 bg-[rgba(48,48,48,0.08)] px-[12px] py-[10px] backdrop-blur-[30px]"
        style={{ left: cardX, top: cardY }}
      >
        {debouncedItem.type === "tweet" ? (
          <TweetOverlayCard tweet={debouncedItem.tweet} />
        ) : (
          <WhaleOverlayCard
            tx={debouncedItem.tx}
            taoUsdPrice={debouncedItem.taoUsdPrice}
            taoDecimals={debouncedItem.taoDecimals}
          />
        )}
      </div>
    </div>
  )
}
