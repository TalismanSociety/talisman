import { cn } from "@talismn/util"
import {
  AreaSeries,
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  type SeriesType,
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

// ────────────────────────────────────────────────────────────────────────────
// Type aliases for cleaner ref declarations
// ────────────────────────────────────────────────────────────────────────────
type ChartApi = IChartApi
type SeriesApi = ISeriesApi<SeriesType>
type PriceLine = ReturnType<SeriesApi["createPriceLine"]>

// ────────────────────────────────────────────────────────────────────────────
// Layout constants
// ────────────────────────────────────────────────────────────────────────────
const LAYOUT = {
  /** Volume section height as ratio of total chart */
  VOLUME_RATIO: 0.1,
  /** RSI section height as ratio of total chart */
  RSI_RATIO: 0.2,
  /** Gap between sections */
  SECTION_GAP: 0.02,
  /** Number of candles visible on initial load */
  INITIAL_VISIBLE_CANDLES: 50,
} as const

// ────────────────────────────────────────────────────────────────────────────
// Color palette
// ────────────────────────────────────────────────────────────────────────────
const COLORS = {
  // Background & grid
  background: "#181818",
  text: "#71717a",
  textSecondary: "#a1a1aa",
  gridLine: "#27272a",
  crosshair: "#525252",

  // Candles
  bullish: "#22c55e",
  bearish: "#ef4444",

  // Indicators
  sma7: "#f59e0b",
  sma25: "#8b5cf6",
  ema12: "#3b82f6",
  ema26: "#ec4899",
  bollingerBand: "#6b7280",
  bollingerBandFaded: "#6b728080",

  // RSI
  rsiLine: "#a855f7",
  rsiBandTop: "rgba(168, 85, 247, 0.08)",
  rsiBandBottom: "rgba(168, 85, 247, 0.04)",
  rsiOverbought: "rgba(239, 68, 68, 0.5)",
  rsiOversold: "rgba(34, 197, 94, 0.5)",

  // Price line
  currentPrice: "#f43f5e",
} as const

// ────────────────────────────────────────────────────────────────────────────
// Utility functions
// ────────────────────────────────────────────────────────────────────────────

/** Format volume with τ prefix and SI suffix (K/M/B) */
const formatVolume = (vol: number): string => {
  if (vol >= 1e9) return `τ${(vol / 1e9).toFixed(1)}B`
  if (vol >= 1e6) return `τ${(vol / 1e6).toFixed(1)}M`
  if (vol >= 1e3) return `τ${(vol / 1e3).toFixed(1)}K`
  if (vol >= 1) return `τ${vol.toFixed(1)}`
  return `τ${vol.toPrecision(3)}`
}

/** RSI autoscale: always 0–100 range */
const rsiAutoscaleProvider = () => ({
  priceRange: { minValue: 0, maxValue: 100 },
})

// ────────────────────────────────────────────────────────────────────────────
// Chart configuration
// ────────────────────────────────────────────────────────────────────────────

const createChartOptions = (width: number, height: number) =>
  ({
    width,
    height,
    layout: {
      background: { color: COLORS.background },
      textColor: COLORS.text,
    },
    grid: {
      vertLines: { visible: false },
      horzLines: { color: COLORS.gridLine, style: 3 },
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
      vertLine: {
        color: COLORS.crosshair,
        width: 1,
        style: 3,
        labelBackgroundColor: COLORS.gridLine,
      },
      horzLine: {
        color: COLORS.crosshair,
        width: 1,
        style: 3,
        labelBackgroundColor: COLORS.gridLine,
      },
    },
  }) as const

const CANDLESTICK_OPTIONS = {
  upColor: COLORS.bullish,
  downColor: COLORS.bearish,
  borderUpColor: COLORS.bullish,
  borderDownColor: COLORS.bearish,
  wickUpColor: COLORS.bullish,
  wickDownColor: COLORS.bearish,
  priceFormat: { type: "price", precision: 6, minMove: 0.000001 },
} as const

const VOLUME_OPTIONS = {
  priceFormat: { type: "volume" },
  priceScaleId: "", // overlay scale — no visible labels
} as const

// ────────────────────────────────────────────────────────────────────────────
// Component interfaces
// ────────────────────────────────────────────────────────────────────────────

interface PriceChartGraphProps {
  netuid: number
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
  // ── Chart refs (cleaned up on unmount) ────────────────────────────────
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ChartApi | null>(null)
  const candlestickSeriesRef = useRef<SeriesApi | null>(null)
  const volumeSeriesRef = useRef<SeriesApi | null>(null)
  const rsiSeriesRef = useRef<SeriesApi | null>(null)
  const overlaySeriesRef = useRef<SeriesApi[]>([])
  const priceLineRef = useRef<PriceLine | null>(null)
  const volumeLegendRef = useRef<HTMLDivElement | null>(null)
  const initialFitDoneRef = useRef(false)

  // Stable refs for scroll handler to avoid stale closures
  const hasMoreRef = useRef(hasMore)
  const loadMoreRef = useRef(loadMore)
  hasMoreRef.current = hasMore
  loadMoreRef.current = loadMore

  // ── Effect 1: Create chart instance (mount-only) ──────────────────────
  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) return

    const chart = createChart(
      container,
      createChartOptions(container.clientWidth, container.clientHeight)
    )
    const candlestickSeries = chart.addSeries(CandlestickSeries, CANDLESTICK_OPTIONS)
    const volumeSeries = chart.addSeries(HistogramSeries, VOLUME_OPTIONS)

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries

    // ── Volume legend (shows value on hover) ────────────────────────────
    const volumeLegend = document.createElement("div")
    Object.assign(volumeLegend.style, {
      position: "absolute",
      left: "8px",
      zIndex: "10",
      fontSize: "11px",
      lineHeight: "16px",
      color: COLORS.textSecondary,
      pointerEvents: "none",
      fontFamily: "monospace",
    } satisfies Partial<CSSStyleDeclaration>)
    container.appendChild(volumeLegend)
    volumeLegendRef.current = volumeLegend

    chart.subscribeCrosshairMove((param) => {
      if (volumeSeriesRef.current && volumeLegendRef.current) {
        const volData = param.seriesData?.get(volumeSeriesRef.current) as
          | { value?: number }
          | undefined
        volumeLegendRef.current.textContent =
          volData?.value != null ? `Vol ${formatVolume(volData.value)}` : ""
      }
    })

    // ── Lazy-load: fetch more when scrolling left ───────────────────────
    const onVisibleRangeChange = (range: { from: number; to: number } | null) => {
      if (range && range.from < 10 && hasMoreRef.current) {
        loadMoreRef.current()
      }
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(onVisibleRangeChange)

    // ── Resize handler ──────────────────────────────────────────────────

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
      rsiSeriesRef.current = null
      volumeLegendRef.current = null
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
    rsiSeriesRef.current = null

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
      color: b.close >= b.open ? `${COLORS.bullish}80` : `${COLORS.bearish}80`,
    }))

    candlestickSeries.setData(candleData)
    volumeSeries.setData(volumeData)

    // ── Extract reusable values ─────────────────────────────────────────
    const closePrices = candleData.map((d) => d.close)
    const times = candleData.map((d) => d.time)
    const rsiVisible = indicators.rsi && closePrices.length >= 14
    const { VOLUME_RATIO, RSI_RATIO, SECTION_GAP } = LAYOUT

    // ── Configure layout margins ────────────────────────────────────────
    const bottomMargin = VOLUME_RATIO + SECTION_GAP + (rsiVisible ? RSI_RATIO + SECTION_GAP : 0)
    const volumeTop = 1 - VOLUME_RATIO - (rsiVisible ? SECTION_GAP + RSI_RATIO : 0)
    const volumeBottom = rsiVisible ? SECTION_GAP + RSI_RATIO : 0

    chart.priceScale("right").applyOptions({
      scaleMargins: { top: 0, bottom: bottomMargin },
    })

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: volumeTop, bottom: volumeBottom },
    })

    // ── Update volume legend position ───────────────────────────────────
    if (volumeLegendRef.current) {
      volumeLegendRef.current.style.top = `${volumeTop * 100}%`
    }

    // ── Helper to add line overlays ─────────────────────────────────────
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

    // ── Moving averages ─────────────────────────────────────────────────
    if (indicators.sma7 && closePrices.length >= 7)
      addOverlay(calculateSMA(closePrices, 7), { color: COLORS.sma7, lineWidth: 1 })

    if (indicators.sma25 && closePrices.length >= 25)
      addOverlay(calculateSMA(closePrices, 25), { color: COLORS.sma25, lineWidth: 1 })

    if (indicators.ema12 && closePrices.length >= 12)
      addOverlay(calculateEMA(closePrices, 12), { color: COLORS.ema12, lineWidth: 1 })

    if (indicators.ema26 && closePrices.length >= 26)
      addOverlay(calculateEMA(closePrices, 26), { color: COLORS.ema26, lineWidth: 1 })

    // ── Bollinger Bands ─────────────────────────────────────────────────
    if (indicators.bollingerBands && closePrices.length >= 20) {
      const bb = calculateBollingerBands(closePrices, 20, 2)
      addOverlay(bb.upper, { color: COLORS.bollingerBandFaded, lineWidth: 1, lineStyle: 2 })
      addOverlay(bb.middle, { color: COLORS.bollingerBand, lineWidth: 1 })
      addOverlay(bb.lower, { color: COLORS.bollingerBandFaded, lineWidth: 1, lineStyle: 2 })
    }

    // ── RSI indicator ───────────────────────────────────────────────────
    if (rsiVisible) {
      const rsiData = calculateRSI(closePrices, 14)

      // Band fill (70 → 30 zone)
      const bandFillSeries = chart.addSeries(AreaSeries, {
        topColor: COLORS.rsiBandTop,
        bottomColor: COLORS.rsiBandBottom,
        lineColor: "transparent",
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: "rsi",
        lastValueVisible: false,
        priceLineVisible: false,
        autoscaleInfoProvider: rsiAutoscaleProvider,
      })
      bandFillSeries.setData(times.map((time) => ({ time, value: 70 })))
      overlaySeriesRef.current.push(bandFillSeries)

      // Configure RSI scale
      chart.priceScale("rsi").applyOptions({
        scaleMargins: { top: 1 - RSI_RATIO, bottom: 0 },
        visible: true,
        alignLabels: true,
      })

      // Mask below 30 to clip the band fill
      const maskSeries = chart.addSeries(AreaSeries, {
        topColor: COLORS.background,
        bottomColor: COLORS.background,
        lineColor: "transparent",
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: "rsi",
        lastValueVisible: false,
        priceLineVisible: false,
        autoscaleInfoProvider: rsiAutoscaleProvider,
      })
      maskSeries.setData(times.map((time) => ({ time, value: 30 })))
      overlaySeriesRef.current.push(maskSeries)

      // RSI line (renders on top of the band)
      const rsiSeries = chart.addSeries(LineSeries, {
        color: COLORS.rsiLine,
        lineWidth: 1,
        priceScaleId: "rsi",
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(0) },
        autoscaleInfoProvider: rsiAutoscaleProvider,
      })
      const rsiLineData = times
        .map((time, i) => ({ time, value: rsiData[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      rsiSeries.setData(rsiLineData)
      overlaySeriesRef.current.push(rsiSeries)
      rsiSeriesRef.current = rsiSeries

      // Threshold lines at 30 and 70
      rsiSeries.createPriceLine({
        price: 70,
        color: COLORS.rsiOverbought,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      })
      rsiSeries.createPriceLine({
        price: 30,
        color: COLORS.rsiOversold,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      })
    }

    // ── Current price line ──────────────────────────────────────────────
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
        color: COLORS.currentPrice,
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

    // ── Initial visible range ────────────────────────────────────────────
    if (!initialFitDoneRef.current && candleData.length > 0) {
      const total = candleData.length
      chart.timeScale().setVisibleLogicalRange({
        from: total - LAYOUT.INITIAL_VISIBLE_CANDLES,
        to: total - 1,
      })
      initialFitDoneRef.current = true
    }
  }, [bars, tweets, tokenPrice, indicators])

  return <div ref={chartContainerRef} className="size-full" />
}
