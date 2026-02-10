import { cn } from "@talismn/util"
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts"
import { type FC, useEffect, useRef } from "react"

import {
  calculateBollingerBands,
  calculateEMA,
  calculateRSI,
  calculateSMA,
  getSentimentColor,
} from "./indicators"
import type { IndicatorConfig } from "./types"
import { usePriceChartData } from "./usePriceChartData"
import { useSubnetStats } from "./useSubnetStats"

interface PriceChartGraphProps {
  netuid: number
  timeRange: number
  indicators: IndicatorConfig
}

export const PriceChartGraph: FC<PriceChartGraphProps> = ({ netuid, timeRange, indicators }) => {
  const { hourlyData, priceData, tweets, isLoading } = usePriceChartData(netuid, timeRange)
  const { tokenPrice } = useSubnetStats(netuid)

  if (isLoading) {
    return <PriceChartGraphSkeleton />
  }

  if (hourlyData.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center text-body-secondary">
        No data available for this subnet.
      </div>
    )
  }

  return (
    <PriceChartGraphContent
      hourlyData={hourlyData}
      priceData={priceData}
      tweets={tweets}
      tokenPrice={tokenPrice}
      indicators={indicators}
    />
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

      {/* Price scale skeleton (right side) */}
      <div className="absolute top-4 right-2 bottom-16 flex w-14 flex-col justify-between">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>

      {/* Time scale skeleton (bottom) */}
      <div className="absolute right-16 bottom-2 left-4 flex justify-between">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-10" />
      </div>

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
  hourlyData: ReturnType<typeof usePriceChartData>["hourlyData"]
  priceData: ReturnType<typeof usePriceChartData>["priceData"]
  tweets: ReturnType<typeof usePriceChartData>["tweets"]
  tokenPrice: number | null
  indicators: IndicatorConfig
}

const PriceChartGraphContent: FC<PriceChartGraphContentProps> = ({
  hourlyData,
  priceData,
  tweets,
  tokenPrice,
  indicators,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartContainerRef.current || hourlyData.length === 0 || !priceData) return

    // Get flow range
    const flowValues = hourlyData.flatMap((d) => [d.open, d.high, d.low, d.close])
    const flowMin = Math.min(...flowValues)
    const flowMax = Math.max(...flowValues)
    const flowRange = flowMax - flowMin || 1

    // Get price range from raw price data
    const prices = priceData.map((p) => parseFloat(p.movingPrice)).filter((p) => p > 0)
    const priceMin = prices.length > 0 ? Math.min(...prices) : 0.001
    const priceMax = prices.length > 0 ? Math.max(...prices) : 0.01
    const priceRange = priceMax - priceMin || 0.001

    // Normalize flow to price scale
    const normalizeToPrice = (flowVal: number) =>
      priceMin + ((flowVal - flowMin) * priceRange) / flowRange

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      // height: 400,
      layout: {
        background: {
          color: "#181818", // grey-900
        },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "#27272a", style: 3 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.25 },
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

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: { type: "price", precision: 6, minMove: 0.000001 },
    })

    // Create volume histogram series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    })

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    // Transform data
    const candleData = hourlyData
      .map((d) => ({
        time: Math.floor(d.hour.getTime() / 1000) as UTCTimestamp,
        open: normalizeToPrice(d.open),
        high: normalizeToPrice(d.high),
        low: normalizeToPrice(d.low),
        close: normalizeToPrice(d.close),
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))

    // Transform volume data
    const volumeData = hourlyData
      .map((d) => ({
        time: Math.floor(d.hour.getTime() / 1000) as UTCTimestamp,
        value: d.volume,
        color: d.close >= d.open ? "#22c55e80" : "#ef444480",
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))

    candlestickSeries.setData(candleData)
    volumeSeries.setData(volumeData)

    // Extract close prices for technical indicators
    const closePrices = candleData.map((d) => d.close)
    const times = candleData.map((d) => d.time)

    // Add SMA 7 indicator
    if (indicators.sma7 && closePrices.length >= 7) {
      const sma7Data = calculateSMA(closePrices, 7)
      const sma7Series = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const sma7LineData = times
        .map((time, i) => ({ time, value: sma7Data[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      sma7Series.setData(sma7LineData)
    }

    // Add SMA 25 indicator
    if (indicators.sma25 && closePrices.length >= 25) {
      const sma25Data = calculateSMA(closePrices, 25)
      const sma25Series = chart.addSeries(LineSeries, {
        color: "#8b5cf6",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const sma25LineData = times
        .map((time, i) => ({ time, value: sma25Data[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      sma25Series.setData(sma25LineData)
    }

    // Add EMA 12 indicator
    if (indicators.ema12 && closePrices.length >= 12) {
      const ema12Data = calculateEMA(closePrices, 12)
      const ema12Series = chart.addSeries(LineSeries, {
        color: "#3b82f6",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const ema12LineData = times
        .map((time, i) => ({ time, value: ema12Data[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      ema12Series.setData(ema12LineData)
    }

    // Add EMA 26 indicator
    if (indicators.ema26 && closePrices.length >= 26) {
      const ema26Data = calculateEMA(closePrices, 26)
      const ema26Series = chart.addSeries(LineSeries, {
        color: "#ec4899",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const ema26LineData = times
        .map((time, i) => ({ time, value: ema26Data[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      ema26Series.setData(ema26LineData)
    }

    // Add Bollinger Bands indicator
    if (indicators.bollingerBands && closePrices.length >= 20) {
      const bb = calculateBollingerBands(closePrices, 20, 2)

      // Upper band
      const bbUpperSeries = chart.addSeries(LineSeries, {
        color: "#6b728080",
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const bbUpperData = times
        .map((time, i) => ({ time, value: bb.upper[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      bbUpperSeries.setData(bbUpperData)

      // Middle band (SMA 20)
      const bbMiddleSeries = chart.addSeries(LineSeries, {
        color: "#6b7280",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const bbMiddleData = times
        .map((time, i) => ({ time, value: bb.middle[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      bbMiddleSeries.setData(bbMiddleData)

      // Lower band
      const bbLowerSeries = chart.addSeries(LineSeries, {
        color: "#6b728080",
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      })
      const bbLowerData = times
        .map((time, i) => ({ time, value: bb.lower[i] }))
        .filter((d) => d.value !== null) as { time: UTCTimestamp; value: number }[]
      bbLowerSeries.setData(bbLowerData)
    }

    // Add RSI indicator (separate pane)
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

      // Add RSI overbought/oversold lines
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

    // Add current price line
    if (tokenPrice && candleData.length > 0) {
      const lastCandle = candleData[candleData.length - 1]
      candlestickSeries.createPriceLine({
        price: lastCandle.close,
        color: "#f43f5e",
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "",
      })
    }

    // Add tweet markers if available
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

    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      chart.remove()
    }
  }, [hourlyData, priceData, tweets, tokenPrice, indicators])

  return (
    <div className="size-full overflow-hidden pt-10 pr-2 pb-5 pl-12">
      <div ref={chartContainerRef} className="size-full"></div>
    </div>
  )
}
