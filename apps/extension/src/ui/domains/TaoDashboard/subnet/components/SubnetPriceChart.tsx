import { cn } from "@talismn/util"
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  type UTCTimestamp,
} from "lightweight-charts"
import { type FC, useEffect, useMemo, useRef, useState } from "react"

import {
  useSubnetPrice,
  useSubnetStakeEvents,
  useSubnetTokenomics,
  useSubnetTweets,
  useTaoPrice,
} from "../../hooks/useSn45Api"

interface SubnetPriceChartProps {
  netuid: number
  className?: string
}

interface ProcessedHourlyData {
  hour: Date
  open: number
  high: number
  low: number
  close: number
  taoIn: number
  taoOut: number
}

// Process stake events into hourly OHLC data
function processStakeEventsToOHLC(
  stakeEvents: Array<{
    method: "Adding" | "Removing"
    alphaAmount: string
    taoAmount: string
    timestamp: string
  }>,
  _priceData: Array<{
    movingPrice: string
    timestamp: string
  }>
): ProcessedHourlyData[] {
  if (stakeEvents.length === 0) return []

  // Process stake events with cumulative sum
  const processedStakes = stakeEvents.map((e) => ({
    ...e,
    timestamp: new Date(e.timestamp),
    alpha: parseFloat(e.alphaAmount) / 1e9,
    tao: parseFloat(e.taoAmount) / 1e9,
  }))

  processedStakes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  let cumsum = 0
  const withCumsum = processedStakes.map((s) => {
    const alphaSigned = s.method === "Adding" ? s.alpha : -s.alpha
    cumsum += alphaSigned
    return {
      ...s,
      alphaSigned,
      cumsum,
      hour: new Date(Math.floor(s.timestamp.getTime() / 3600000) * 3600000),
      taoIn: s.method === "Adding" ? s.tao : 0,
      taoOut: s.method === "Removing" ? s.tao : 0,
    }
  })

  // Group by hour
  const hourlyMap = new Map<
    string,
    { hour: Date; cumsums: number[]; taoIn: number; taoOut: number }
  >()

  for (const stake of withCumsum) {
    const hourKey = stake.hour.toISOString()
    if (!hourlyMap.has(hourKey)) {
      hourlyMap.set(hourKey, { hour: stake.hour, cumsums: [], taoIn: 0, taoOut: 0 })
    }
    const entry = hourlyMap.get(hourKey)!
    entry.cumsums.push(stake.cumsum)
    entry.taoIn += stake.taoIn
    entry.taoOut += stake.taoOut
  }

  // Build hourly data
  const hourlyEntries = Array.from(hourlyMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  )

  return hourlyEntries.map(([, data]) => ({
    hour: data.hour,
    open: data.cumsums[0],
    high: Math.max(...data.cumsums),
    low: Math.min(...data.cumsums),
    close: data.cumsums[data.cumsums.length - 1],
    taoIn: data.taoIn,
    taoOut: data.taoOut,
  }))
}

const TIME_RANGES = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "All", value: 0 },
]

export const SubnetPriceChart: FC<SubnetPriceChartProps> = ({ netuid, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const { data: priceData, isLoading: priceLoading } = useSubnetPrice(netuid)
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tweets } = useSubnetTweets(netuid, 50)
  const { data: taoPrice } = useTaoPrice()
  const { data: tokenomics } = useSubnetTokenomics(netuid)

  const [timeRange, setTimeRange] = useState(30) // days

  const isLoading = priceLoading || stakeLoading

  // Process data
  const allHourlyData = useMemo(() => {
    if (!stakeEvents || !priceData) return []
    return processStakeEventsToOHLC(stakeEvents, priceData)
  }, [stakeEvents, priceData])

  // Filter by time range
  const hourlyData = useMemo(() => {
    if (timeRange === 0) return allHourlyData
    const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000
    return allHourlyData.filter((d) => d.hour.getTime() >= cutoff)
  }, [allHourlyData, timeRange])

  // Calculate totals
  const totals = useMemo(() => {
    if (hourlyData.length === 0) return { alphaIn: 0, alphaOut: 0, taoIn: 0, taoOut: 0 }

    const taoIn = hourlyData.reduce((sum, d) => sum + d.taoIn, 0)
    const taoOut = hourlyData.reduce((sum, d) => sum + d.taoOut, 0)

    return { alphaIn: 0, alphaOut: 0, taoIn, taoOut }
  }, [hourlyData])

  // Current token price
  const tokenPrice = tokenomics ? parseFloat(tokenomics.movingPrice) : null
  const tokenPriceUsd =
    tokenPrice && taoPrice?.price ? tokenPrice * parseFloat(taoPrice.price) : null

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
      height: 400,
      layout: {
        background: { color: "#1a1a1a" },
        textColor: "#888888",
      },
      grid: {
        vertLines: { color: "#2a2a2a" },
        horzLines: { color: "#2a2a2a" },
      },
      rightPriceScale: {
        borderColor: "#2a2a2a",
        scaleMargins: { top: 0.15, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "#2a2a2a",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
    })

    // Create candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: { type: "price", precision: 6, minMove: 0.000001 },
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

    candlestickSeries.setData(candleData)

    // Add tweet markers if available
    if (tweets && tweets.length > 0 && candleData.length > 0) {
      const minTime = candleData[0].time
      const maxTime = candleData[candleData.length - 1].time

      const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
          case "very_bullish":
            return "#16a34a"
          case "bullish":
            return "#22c55e"
          case "neutral":
            return "#a1a1aa"
          case "bearish":
            return "#f87171"
          case "very_bearish":
            return "#dc2626"
          default:
            return "#a1a1aa"
        }
      }

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
  }, [hourlyData, priceData, tweets])

  const netTao = totals.taoIn - totals.taoOut

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-grey-800" />
          <div className="h-8 w-32 animate-pulse rounded bg-grey-800" />
        </div>
        <div className="flex h-[450px] items-center justify-center rounded-lg bg-grey-900">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
        </div>
      </div>
    )
  }

  if (hourlyData.length === 0) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-medium text-body text-lg">Subnet Token Price</div>
            <div className="text-body-secondary text-xs">Hourly OHLC with X sentiment markers</div>
          </div>
        </div>
        <div className="flex h-[450px] items-center justify-center rounded-lg bg-grey-900 text-body-secondary">
          No data available for this subnet.
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-4">
          <div>
            <div className="font-medium text-body text-lg">Subnet Token Price</div>
            <div className="text-body-secondary text-xs">Hourly OHLC with X sentiment markers</div>
          </div>
          {/* Token Price Badge */}
          {tokenPriceUsd !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5">
              <span className="text-body-secondary text-xs">Token Price</span>
              <span className="font-bold text-lg text-primary">${tokenPriceUsd.toFixed(2)}</span>
              <span className="text-[10px] text-body-secondary">({tokenPrice?.toFixed(4)} τ)</span>
            </div>
          )}
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1 rounded-lg border border-grey-750 bg-grey-850 px-2 py-1.5">
          {TIME_RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeRange(option.value)}
              className={cn(
                "rounded px-3 py-1 font-medium text-xs transition-colors",
                timeRange === option.value
                  ? "bg-primary text-white"
                  : "text-body-secondary hover:bg-grey-750 hover:text-body"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative overflow-hidden rounded-lg bg-grey-900">
        {/* Stats overlay */}
        <div className="absolute top-4 left-4 z-10 text-sm">
          <span className="text-[#26a69a]">τ In: {totals.taoIn.toFixed(1)}</span>
          <span className="mx-2 text-body-secondary">|</span>
          <span className="text-[#ef5350]">Out: {totals.taoOut.toFixed(1)}</span>
          <span className="mx-2 text-body-secondary">|</span>
          <span className={netTao >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}>
            Net: {netTao >= 0 ? "+" : ""}
            {netTao.toFixed(1)}
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3 rounded-lg bg-grey-800/90 px-3 py-1.5 text-[10px] text-body-secondary">
          <span className="text-grey-600">Posts:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
            Bullish
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#ef5350]" />
            Bearish
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-[#a1a1aa]" />
            Neutral
          </span>
        </div>

        <div ref={chartContainerRef} />
      </div>
    </div>
  )
}
