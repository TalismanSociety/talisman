import { cn } from "@talismn/util"
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts"
import { type FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSubnetTweets } from "../../../hooks/useSn45Api"
import {
  calculateBollingerBands,
  calculateEMA,
  calculateRSI,
  calculateSMA,
  getSentimentColor,
} from "./indicators"
import { PriceChartToolbar } from "./PriceChartToolbar"
import type { IndicatorConfig, OhlcvBar } from "./types"
import { DEFAULT_INDICATORS } from "./types"
import { useOhlcvData } from "./useOhlcvData"
import { useSubnetStats } from "./useSubnetStats"

interface PriceChartGraphProps {
  netuid: number
  // timeRange: number
  // indicators: IndicatorConfig
}

export const PriceChartGraph: FC<PriceChartGraphProps> = ({ netuid }) => {
  const { t } = useTranslation()
  const [timeRange, _setTimeRange] = useState(7) // days - default to 1W
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS)

  const { bars, isLoading, hasMore, loadMore } = useOhlcvData({ netuid })
  const { data: tweets } = useSubnetTweets(netuid, timeRange || 50)
  const {
    data: { tokenPrice },
  } = useSubnetStats(netuid)

  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  if (isLoading) {
    return <PriceChartGraphSkeleton />
  }

  if (bars.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-body-secondary">
        {t("Failed to fetch data")}
      </div>
    )
  }

  return (
    <div className="relative flex size-full flex-col overflow-hidden">
      <PriceChartToolbar
        indicators={indicators}
        toggleIndicator={toggleIndicator}
        timeRange={timeRange}
        setTimeRange={_setTimeRange}
        className="my-5 px-12"
      />
      <div className="grow">
        <PriceChartGraphContent
          bars={bars}
          hasMore={hasMore}
          loadMore={loadMore}
          tweets={tweets}
          tokenPrice={tokenPrice}
          indicators={indicators}
        />
      </div>
    </div>
  )
}

const PriceChartGraphSkeleton = () => (
  <div className="relative h-[400px] w-full bg-[#181818]">
    {/* Chart area skeleton */}
    <div className="absolute inset-0 flex flex-col px-4 py-3">
      {/* Grid lines simulation */}
      <div className="absolute inset-x-4 top-[20%] h-px bg-grey-800/50" />
      <div className="absolute inset-x-4 top-[40%] h-px bg-grey-800/50" />
      <div className="absolute inset-x-4 top-[60%] h-px bg-grey-800/50" />
      <div className="absolute inset-x-4 top-[80%] h-px bg-grey-800/50" />

      {/* Central chart area with candlestick-like shapes */}
      <div className="absolute inset-x-8 top-8 bottom-20 flex items-center justify-center gap-4">
        <div className="flex h-3/4 items-center gap-2">
          <div className="flex h-full flex-col items-center justify-center gap-px">
            <Skeleton className="h-4 w-px" />
            <Skeleton className="h-16 w-3 bg-buy/30" />
            <Skeleton className="h-6 w-px" />
          </div>
          <div className="flex h-full flex-col items-center justify-center gap-px">
            <Skeleton className="h-8 w-px" />
            <Skeleton className="h-12 w-3 bg-sell/30" />
            <Skeleton className="h-4 w-px" />
          </div>
          <div className="flex h-full flex-col items-center justify-center gap-px">
            <Skeleton className="h-6 w-px" />
            <Skeleton className="h-20 w-3 bg-buy/30" />
            <Skeleton className="h-6 w-px" />
          </div>
          <div className="flex h-full flex-col items-center justify-center gap-px">
            <Skeleton className="h-4 w-px" />
            <Skeleton className="h-10 w-3 bg-sell/30" />
            <Skeleton className="h-8 w-px" />
          </div>
          <div className="flex h-full flex-col items-center justify-center gap-px">
            <Skeleton className="h-10 w-px" />
            <Skeleton className="h-14 w-3 bg-buy/30" />
            <Skeleton className="h-4 w-px" />
          </div>
        </div>
      </div>
    </div>

    {/* TradingView logo placeholder */}
    <div className="pointer-events-none absolute bottom-12 left-4 z-10 flex items-center gap-1 opacity-30">
      <Skeleton className="size-5 rounded-full" />
    </div>
  </div>
)

const Skeleton: FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse rounded-xs bg-grey-800", className)} />
)

// Internal component that renders the actual chart (no loading handling)
interface PriceChartGraphContentProps {
  bars: OhlcvBar[]
  hasMore: boolean
  loadMore: () => void
  tweets: ReturnType<typeof useSubnetTweets>["data"]
  tokenPrice: number | null
  indicators: IndicatorConfig
}

const PriceChartGraphContent: FC<PriceChartGraphContentProps> = ({
  bars,
  hasMore,
  loadMore,
  tweets,
  tokenPrice,
  indicators,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Persistent refs so the chart instance survives data updates
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const candlestickSeriesRef = useRef<ReturnType<
    ReturnType<typeof createChart>["addSeries"]
  > | null>(null)
  const volumeSeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addSeries"]> | null>(
    null
  )
  // Extra overlay series (indicators) that need to be cleaned up between updates
  const overlaySeriesRef = useRef<ReturnType<ReturnType<typeof createChart>["addSeries"]>[]>([])
  const priceLineRef = useRef<ReturnType<
    ReturnType<ReturnType<typeof createChart>["addSeries"]>["createPriceLine"]
  > | null>(null)
  const initialFitDoneRef = useRef(false)

  // Keep hasMore / loadMore in refs so the scroll handler never becomes stale
  // and never triggers effect re-runs
  const hasMoreRef = useRef(hasMore)
  const loadMoreRef = useRef(loadMore)
  hasMoreRef.current = hasMore
  loadMoreRef.current = loadMore

  // ── Effect 1: create / destroy the chart (mount-only) ─────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#181818" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#27272a", style: 3 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0, bottom: 0.25 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "#525252", width: 1, style: 3, labelBackgroundColor: "#27272a" },
        horzLine: { color: "#525252", width: 1, style: 3, labelBackgroundColor: "#27272a" },
      },
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: { type: "price", precision: 6, minMove: 0.000001 },
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    })
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries

    // Lazy-load: only fires when the user scrolls left
    const onVisibleRangeChange = (range: { from: number; to: number } | null) => {
      if (range && range.from < 10 && hasMoreRef.current) {
        loadMoreRef.current()
      }
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChange)

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRangeChange)
      window.removeEventListener("resize", handleResize)
      chart.remove()
      chartRef.current = null
      candlestickSeriesRef.current = null
      volumeSeriesRef.current = null
      overlaySeriesRef.current = []
      initialFitDoneRef.current = false
    }
  }, []) // mount-only — chart lifecycle is independent of data

  // ── Effect 2: update series data when bars / indicators change ────────
  useEffect(() => {
    const chart = chartRef.current
    const candlestickSeries = candlestickSeriesRef.current
    const volumeSeries = volumeSeriesRef.current
    if (!chart || !candlestickSeries || !volumeSeries || bars.length === 0) return

    // ── Remove previous overlay series (indicators, price lines, etc.) ──
    for (const s of overlaySeriesRef.current) {
      try {
        chart.removeSeries(s)
      } catch {
        /* series may already have been removed */
      }
    }
    overlaySeriesRef.current = []

    // ── Primary data ────────────────────────────────────────────────────
    const candleData = bars.map((b) => ({
      time: b.time as UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }))

    const volumeData = bars.map((b) => ({
      time: b.time as UTCTimestamp,
      value: b.volume,
      color: b.close >= b.open ? "#22c55e80" : "#ef444480",
    }))

    candlestickSeries.setData(candleData)
    volumeSeries.setData(volumeData)

    // ── Technical indicators ────────────────────────────────────────────
    const closePrices = candleData.map((d) => d.close)
    const times = candleData.map((d) => d.time)

    const addOverlay = (data: (number | null)[], opts: Parameters<typeof chart.addSeries>[1]) => {
      const series = chart.addSeries(LineSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
        ...opts,
      })
      const lineData = times
        .map((time, i) => ({ time, value: data[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      series.setData(lineData)
      overlaySeriesRef.current.push(series)
      return series
    }

    if (indicators.sma7 && closePrices.length >= 7)
      addOverlay(calculateSMA(closePrices, 7), { color: "#f59e0b", lineWidth: 1 })

    if (indicators.sma25 && closePrices.length >= 25)
      addOverlay(calculateSMA(closePrices, 25), { color: "#8b5cf6", lineWidth: 1 })

    if (indicators.ema12 && closePrices.length >= 12)
      addOverlay(calculateEMA(closePrices, 12), { color: "#3b82f6", lineWidth: 1 })

    if (indicators.ema26 && closePrices.length >= 26)
      addOverlay(calculateEMA(closePrices, 26), { color: "#ec4899", lineWidth: 1 })

    if (indicators.bollingerBands && closePrices.length >= 20) {
      const bb = calculateBollingerBands(closePrices, 20, 2)
      addOverlay(bb.upper, { color: "#6b728080", lineWidth: 1, lineStyle: 2 })
      addOverlay(bb.middle, { color: "#6b7280", lineWidth: 1 })
      addOverlay(bb.lower, { color: "#6b728080", lineWidth: 1, lineStyle: 2 })
    }

    if (indicators.rsi && closePrices.length >= 14) {
      const rsiData = calculateRSI(closePrices, 14)
      const rsiSeries = chart.addSeries(LineSeries, {
        color: "#a855f7",
        lineWidth: 1,
        priceScaleId: "rsi",
        priceLineVisible: false,
        lastValueVisible: true,
        priceFormat: { type: "price", precision: 1, minMove: 0.1 },
      })
      chart.priceScale("rsi").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0.02 },
        borderVisible: false,
      })
      const rsiLineData = times
        .map((time, i) => ({ time, value: rsiData[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      rsiSeries.setData(rsiLineData)
      overlaySeriesRef.current.push(rsiSeries)

      if (rsiLineData.length > 0) {
        rsiSeries.createPriceLine({
          price: 70,
          color: "#ef444480",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "",
        })
        rsiSeries.createPriceLine({
          price: 30,
          color: "#22c55e80",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: false,
          title: "",
        })
      }
    }

    // ── Current price line (remove previous before adding new) ───────
    if (priceLineRef.current) {
      try {
        candlestickSeries.removePriceLine(priceLineRef.current)
      } catch {
        /* already removed */
      }
      priceLineRef.current = null
    }
    if (tokenPrice && candleData.length > 0) {
      const lastCandle = candleData[candleData.length - 1]
      priceLineRef.current = candlestickSeries.createPriceLine({
        price: lastCandle.close,
        color: "#f43f5e",
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "",
      })
    }

    // ── Tweet markers ───────────────────────────────────────────────────
    if (tweets && tweets.length > 0 && candleData.length > 0) {
      const minTime = candleData[0].time
      const maxTime = candleData[candleData.length - 1].time

      const markers = tweets
        .filter((tweet) => {
          if (!tweet.createdAt) return false
          const tweetTime = Math.floor(new Date(tweet.createdAt).getTime() / 1000)
          return tweetTime >= (minTime as number) && tweetTime <= (maxTime as number)
        })
        .map((tweet) => {
          const tweetTime = Math.floor(new Date(tweet.createdAt).getTime() / 1000) as UTCTimestamp
          const isBullish = tweet.sentiment === "bullish" || tweet.sentiment === "very_bullish"
          return {
            time: tweetTime,
            position: isBullish ? ("aboveBar" as const) : ("belowBar" as const),
            color: getSentimentColor(tweet.sentiment),
            shape: "circle" as const,
            text: tweet.impactPotential === "high" ? "!" : "",
          }
        })
        .sort((a, b) => (a.time as number) - (b.time as number))

      if (markers.length > 0) {
        createSeriesMarkers(candlestickSeries, markers)
      }
    }

    // ── Show only the latest candles on initial load ────────────────────
    if (!initialFitDoneRef.current && candleData.length > 0) {
      const INITIAL_VISIBLE = 50
      const total = candleData.length
      chart.timeScale().setVisibleLogicalRange({
        from: total - INITIAL_VISIBLE,
        to: total - 1,
      })
      initialFitDoneRef.current = true
    }
  }, [bars, tweets, tokenPrice, indicators])

  return <div ref={chartContainerRef} className="size-full"></div>
}
