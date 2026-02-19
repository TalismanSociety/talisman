import { Skeleton } from "@ui/domains/TaoDashboard/shared/Skeleton"
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
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSubnetTweets } from "../../../hooks/useSn45Api"
import { createChartOptions } from "../chartOptions"
import { CHART_COLORS, CHART_LAYOUT, INDICATOR_CONFIG } from "./chartConfig"
import {
  calculateBollingerBands,
  calculateRSI,
  calculateSMA,
  getSentimentColor,
} from "./indicators"
import { PriceChartToolbar } from "./PriceChartToolbar"
import type { IndicatorConfig, OhlcvBar, OhlcvResolution } from "./types"
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

const CANDLESTICK_OPTIONS = {
  upColor: CHART_COLORS.bullish,
  downColor: CHART_COLORS.bearish,
  borderUpColor: CHART_COLORS.bullish,
  borderDownColor: CHART_COLORS.bearish,
  wickUpColor: CHART_COLORS.bullish,
  wickDownColor: CHART_COLORS.bearish,
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
  const [resolution, setResolution] = useState<OhlcvResolution>("60")
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS)

  const { bars, isLoading, isError, hasMore, loadMore } = useOhlcvData({ netuid, resolution })
  const { data: tweets } = useSubnetTweets(netuid, "1m") // TODO implement cursor and pull as needed
  const {
    data: { tokenPrice },
  } = useSubnetStats(netuid)

  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  if (isLoading) {
    return <PriceChartGraphSkeleton />
  }

  if (isError || bars.length === 0) {
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
        resolution={resolution}
        setResolution={setResolution}
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
  <div className="relative size-full bg-[#181818]">
    {/* Grid lines */}
    <div className="absolute inset-x-4 top-[20%] h-px bg-grey-800/50" />
    <div className="absolute inset-x-4 top-[40%] h-px bg-grey-800/50" />
    <div className="absolute inset-x-4 top-[60%] h-px bg-grey-800/50" />
    <div className="absolute inset-x-4 top-[80%] h-px bg-grey-800/50" />

    {/* Centered candlestick icon */}
    <div className="absolute inset-0 flex animate-pulse items-center justify-center">
      <svg className="h-24 w-32 opacity-50" viewBox="0 0 80 48" fill="none">
        {/* Candle 1 – buy */}
        <line
          x1="12"
          y1="6"
          x2="12"
          y2="42"
          stroke="currentColor"
          strokeWidth="1"
          className="text-buy"
        />
        <rect x="8" y="14" width="8" height="16" rx="1" fill="currentColor" className="text-buy" />
        {/* Candle 2 – sell */}
        <line
          x1="28"
          y1="10"
          x2="28"
          y2="40"
          stroke="currentColor"
          strokeWidth="1"
          className="text-sell"
        />
        <rect
          x="24"
          y="18"
          width="8"
          height="14"
          rx="1"
          fill="currentColor"
          className="text-sell"
        />
        {/* Candle 3 – buy */}
        <line
          x1="44"
          y1="4"
          x2="44"
          y2="38"
          stroke="currentColor"
          strokeWidth="1"
          className="text-buy"
        />
        <rect x="40" y="10" width="8" height="20" rx="1" fill="currentColor" className="text-buy" />
        {/* Candle 4 – sell */}
        <line
          x1="60"
          y1="12"
          x2="60"
          y2="44"
          stroke="currentColor"
          strokeWidth="1"
          className="text-sell"
        />
        <rect
          x="56"
          y="20"
          width="8"
          height="12"
          rx="1"
          fill="currentColor"
          className="text-sell"
        />
        {/* Candle 5 – buy */}
        <line
          x1="76"
          y1="8"
          x2="76"
          y2="36"
          stroke="currentColor"
          strokeWidth="1"
          className="text-buy"
        />
        <rect x="72" y="12" width="8" height="16" rx="1" fill="currentColor" className="text-buy" />
      </svg>
    </div>

    {/* TradingView logo placeholder */}
    <div className="pointer-events-none absolute bottom-12 left-4 z-10 flex items-center gap-1 opacity-30">
      <Skeleton className="size-5 rounded-full" />
    </div>
  </div>
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
      createChartOptions({
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: CHART_COLORS.background,
        textColor: CHART_COLORS.text,
        gridLineColor: CHART_COLORS.gridLine,
        crosshairColor: CHART_COLORS.crosshair,
        rightPriceScaleMargins: { top: 0, bottom: 0.25 },
        hideVerticalGridLines: true,
      })
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
      color: CHART_COLORS.textSecondary,
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

    // ── Resize observer ──────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    resizeObserver.observe(container)

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onVisibleRangeChange)
      resizeObserver.disconnect()
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

  // ── Memoised chart & indicator data (recomputed only when bars change) ─
  const chartData = useMemo(() => {
    if (bars.length === 0) return null

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
      color: b.close >= b.open ? `${CHART_COLORS.bullish}80` : `${CHART_COLORS.bearish}80`,
    }))

    const closePrices = candleData.map((d) => d.close)
    const times = candleData.map((d) => d.time)

    return {
      candleData,
      volumeData,
      closePrices,
      times,
      sma7:
        closePrices.length >= INDICATOR_CONFIG.sma7.period
          ? calculateSMA(closePrices, INDICATOR_CONFIG.sma7.period)
          : null,
      sma25:
        closePrices.length >= INDICATOR_CONFIG.sma25.period
          ? calculateSMA(closePrices, INDICATOR_CONFIG.sma25.period)
          : null,
      sma99:
        closePrices.length >= INDICATOR_CONFIG.sma99.period
          ? calculateSMA(closePrices, INDICATOR_CONFIG.sma99.period)
          : null,
      bollingerBands:
        closePrices.length >= INDICATOR_CONFIG.bollingerBands.period
          ? calculateBollingerBands(
              closePrices,
              INDICATOR_CONFIG.bollingerBands.period,
              INDICATOR_CONFIG.bollingerBands.stdDev
            )
          : null,
      rsi:
        closePrices.length >= INDICATOR_CONFIG.rsi.period
          ? calculateRSI(closePrices, INDICATOR_CONFIG.rsi.period)
          : null,
    }
  }, [bars])

  // ── Effect 2: update series data when bars / indicators change ────────
  useEffect(() => {
    const chart = chartRef.current
    const candlestickSeries = candlestickSeriesRef.current
    const volumeSeries = volumeSeriesRef.current
    if (!chart || !candlestickSeries || !volumeSeries || !chartData) return

    const { candleData, volumeData, times } = chartData

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
    candlestickSeries.setData(candleData)
    volumeSeries.setData(volumeData)

    const rsiVisible = indicators.rsi && chartData.rsi !== null
    const { VOLUME_RATIO, RSI_RATIO, SECTION_GAP } = CHART_LAYOUT

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
    if (indicators.sma7 && chartData.sma7) {
      addOverlay(chartData.sma7, { color: INDICATOR_CONFIG.sma7.color, lineWidth: 1 })
    }

    if (indicators.sma25 && chartData.sma25) {
      addOverlay(chartData.sma25, { color: INDICATOR_CONFIG.sma25.color, lineWidth: 1 })
    }

    if (indicators.sma99 && chartData.sma99) {
      addOverlay(chartData.sma99, { color: INDICATOR_CONFIG.sma99.color, lineWidth: 1 })
    }

    // ── Bollinger Bands ─────────────────────────────────────────────────
    if (indicators.bollingerBands && chartData.bollingerBands) {
      const { color } = INDICATOR_CONFIG.bollingerBands
      const bb = chartData.bollingerBands

      // Area fill from upper band with gradient fading to transparent
      const bbFillSeries = chart.addSeries(AreaSeries, {
        priceScaleId: "right",
        topColor: CHART_COLORS.bollingerBandFill,
        bottomColor: "transparent",
        lineColor: "transparent",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const bbUpperData = times
        .map((time, i) => ({ time, value: bb.upper[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      bbFillSeries.setData(bbUpperData)
      overlaySeriesRef.current.push(bbFillSeries)

      // Upper and lower lines (dashed)
      addOverlay(bb.upper, { color: CHART_COLORS.bollingerBandFaded, lineWidth: 1, lineStyle: 2 })
      addOverlay(bb.lower, { color: CHART_COLORS.bollingerBandFaded, lineWidth: 1, lineStyle: 2 })
      // Middle line (solid)
      addOverlay(bb.middle, { color, lineWidth: 1 })
    }

    // ── RSI indicator ───────────────────────────────────────────────────
    if (rsiVisible) {
      const rsiData = chartData.rsi!

      // Band fill (70 → 30 zone)
      const bandFillSeries = chart.addSeries(AreaSeries, {
        topColor: CHART_COLORS.rsiBandTop,
        bottomColor: CHART_COLORS.rsiBandBottom,
        lineColor: "transparent",
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: "rsi",
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
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
        topColor: CHART_COLORS.background,
        bottomColor: CHART_COLORS.background,
        lineColor: "transparent",
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: "rsi",
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        autoscaleInfoProvider: rsiAutoscaleProvider,
      })
      maskSeries.setData(times.map((time) => ({ time, value: 30 })))
      overlaySeriesRef.current.push(maskSeries)

      // RSI line (renders on top of the band)
      const rsiSeries = chart.addSeries(LineSeries, {
        color: INDICATOR_CONFIG.rsi.color,
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

      // Threshold lines at 30 and 70 (grey)
      rsiSeries.createPriceLine({
        price: 70,
        color: CHART_COLORS.rsiThreshold,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      })
      rsiSeries.createPriceLine({
        price: 30,
        color: CHART_COLORS.rsiThreshold,
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
        color: CHART_COLORS.currentPrice,
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
        from: total - CHART_LAYOUT.INITIAL_VISIBLE_CANDLES,
        to: total - 1,
      })
      initialFitDoneRef.current = true
    }
  }, [chartData, tweets, tokenPrice, indicators])

  return <div ref={chartContainerRef} className="size-full" />
}
