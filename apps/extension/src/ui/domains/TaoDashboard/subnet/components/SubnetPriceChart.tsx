import { Icon } from "@iconify/react"
import { cn } from "@talismn/util"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  useSubnetPrice,
  useSubnetStakeEvents,
  useSubnetTokenomics,
  useSubnetTweets,
  useTaoPrice,
} from "../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

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
  volume: number
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
    volume: data.taoIn + data.taoOut,
  }))
}

const TIME_RANGES = [
  { label: "1D", value: 1 },
  { label: "1W", value: 7 },
  { label: "1M", value: 30 },
]

// Technical indicator calculation functions
function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
  }
  return result
}

function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period
      result.push(sma)
    } else {
      const prevEma = result[i - 1]
      if (prevEma !== null) {
        result.push((data[i] - prevEma) * multiplier + prevEma)
      } else {
        result.push(null)
      }
    }
  }
  return result
}

function calculateBollingerBands(
  data: number[],
  period: number,
  stdDevMultiplier: number
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(data, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null)
      lower.push(null)
    } else {
      const slice = data.slice(i - period + 1, i + 1)
      const mean = middle[i]!
      const variance = slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period
      const stdDev = Math.sqrt(variance)
      upper.push(mean + stdDevMultiplier * stdDev)
      lower.push(mean - stdDevMultiplier * stdDev)
    }
  }

  return { upper, middle, lower }
}

function calculateRSI(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const gains: number[] = []
  const losses: number[] = []

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null)
      continue
    }

    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)

    if (i < period) {
      result.push(null)
    } else if (i === period) {
      const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
      if (avgLoss === 0) {
        result.push(100)
      } else {
        const rs = avgGain / avgLoss
        result.push(100 - 100 / (1 + rs))
      }
    } else {
      const prevRsi = result[i - 1]
      if (prevRsi === null) {
        result.push(null)
        continue
      }
      const prevAvgGain = gains.slice(0, i - 1).reduce((a, b) => a + b, 0) / (i - 1)
      const prevAvgLoss = losses.slice(0, i - 1).reduce((a, b) => a + b, 0) / (i - 1)
      const currentGain = gains[gains.length - 1]
      const currentLoss = losses[losses.length - 1]
      const avgGain = (prevAvgGain * (period - 1) + currentGain) / period
      const avgLoss = (prevAvgLoss * (period - 1) + currentLoss) / period
      if (avgLoss === 0) {
        result.push(100)
      } else {
        const rs = avgGain / avgLoss
        result.push(100 - 100 / (1 + rs))
      }
    }
  }

  return result
}

// Indicator toggle configuration
interface IndicatorConfig {
  sma7: boolean
  sma25: boolean
  ema12: boolean
  ema26: boolean
  bollingerBands: boolean
  rsi: boolean
}

// Format numbers with K, M, B suffixes
const formatCompactNumber = (num: number): string => {
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`
  return `$${num.toFixed(0)}`
}

export const SubnetPriceChart: FC<SubnetPriceChartProps> = ({ netuid, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const { data: priceData, isLoading: priceLoading } = useSubnetPrice(netuid)
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tweets } = useSubnetTweets(netuid, 50)
  const { data: taoPrice } = useTaoPrice()
  const { data: tokenomics } = useSubnetTokenomics(netuid)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const [timeRange, setTimeRange] = useState(7) // days - default to 1W
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    sma7: false,
    sma25: false,
    ema12: true,
    ema26: true,
    bollingerBands: false,
    rsi: false,
  })

  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const isLoading = priceLoading || stakeLoading

  // Get current subnet data for market cap, volume, etc.
  const currentSubnet = useMemo(() => {
    return subnetData.find((s) => Number(s.netuid) === netuid)
  }, [subnetData, netuid])

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

  // Current token price in TAO and USD
  const tokenPrice = tokenomics ? parseFloat(tokenomics.movingPrice) : null
  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : null
  const tokenPriceUsd = tokenPrice && taoUsdPrice ? tokenPrice * taoUsdPrice : null

  // Calculate price change percentage (24h)
  const priceChange24h = currentSubnet?.price_change_1_day
    ? parseFloat(currentSubnet.price_change_1_day)
    : null

  // Market stats
  const marketCap = currentSubnet?.market_cap ? parseFloat(currentSubnet.market_cap) : null
  const volume24h = currentSubnet?.tao_volume_24_hr
    ? parseFloat(currentSubnet.tao_volume_24_hr) * (taoUsdPrice || 0)
    : null
  const totalAlpha = currentSubnet?.total_alpha ? parseFloat(currentSubnet.total_alpha) : null
  const fdv = totalAlpha && tokenPriceUsd ? totalAlpha * tokenPriceUsd : null

  // Daily emissions in TAO
  const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null
  const dailyEmissions = emissionRaw
    ? (Number(emissionRaw) / 1e9) * (7200 / (currentSubnet?.tempo || 360))
    : null

  // Sentiment color helpers
  const _getSentimentColor = useCallback((sentiment: string) => {
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
  }, [])

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
        background: { color: "#0d0d0d" },
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
  }, [hourlyData, priceData, tweets, tokenPrice, indicators])

  const _netTao = totals.taoIn - totals.taoOut

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="h-16 w-48 animate-pulse rounded bg-grey-800" />
            <div className="h-8 w-64 animate-pulse rounded bg-grey-800" />
          </div>
          <div className="mt-4 flex h-[400px] items-center justify-center">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
          </div>
        </div>
      </div>
    )
  }

  if (hourlyData.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Price Display */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-3xl text-white">
                  τ {tokenPrice?.toFixed(6) ?? "0.000000"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-body-secondary text-lg">
                  ${tokenPriceUsd?.toFixed(6) ?? "0.00"}
                </span>
                {priceChange24h !== null && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-sm",
                      priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {Math.abs(priceChange24h).toFixed(2)}%
                    <Icon
                      icon={priceChange24h >= 0 ? "mdi:arrow-top-right" : "mdi:arrow-bottom-right"}
                      className="size-4"
                    />
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex h-[400px] items-center justify-center text-body-secondary">
            No data available for this subnet.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="rounded-lg bg-[#0d0d0d]">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-2">
          {/* Left side - Price Display */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-3xl text-white">
                τ {tokenPrice?.toFixed(6) ?? "0.000000"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-body-secondary text-lg">
                ${tokenPriceUsd?.toFixed(6) ?? "0.00"}
              </span>
              {priceChange24h !== null && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-sm",
                    priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                  )}
                >
                  {Math.abs(priceChange24h).toFixed(2)}%
                  <Icon
                    icon={priceChange24h >= 0 ? "mdi:arrow-top-right" : "mdi:arrow-bottom-right"}
                    className="size-4"
                  />
                </span>
              )}
            </div>
          </div>

          {/* Right side - Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-body-disabled text-xs">Market Cap</span>
              <span className="font-medium text-white">
                {marketCap ? formatCompactNumber(marketCap) : "—"}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-body-disabled text-xs">Volume</span>
              <span className="font-medium text-white">
                {volume24h ? formatCompactNumber(volume24h) : "—"}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-body-disabled text-xs">FDV</span>
              <span className="font-medium text-white">{fdv ? formatCompactNumber(fdv) : "—"}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-body-disabled text-xs">Em</span>
              <span className="font-medium text-white">
                {dailyEmissions ? `τ${dailyEmissions.toFixed(3)}/d` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Time range and indicators row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-2">
          {/* Left side - Indicator toggles */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-body-disabled text-xs">Indicators:</span>
            <button
              type="button"
              onClick={() => toggleIndicator("sma7")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 font-medium text-xs transition-colors",
                indicators.sma7
                  ? "bg-[#f59e0b]/20 text-[#f59e0b]"
                  : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  indicators.sma7 ? "bg-[#f59e0b]" : "bg-grey-600"
                )}
              />
              SMA 7
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator("sma25")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 font-medium text-xs transition-colors",
                indicators.sma25
                  ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                  : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  indicators.sma25 ? "bg-[#8b5cf6]" : "bg-grey-600"
                )}
              />
              SMA 25
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator("ema12")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 font-medium text-xs transition-colors",
                indicators.ema12
                  ? "bg-[#3b82f6]/20 text-[#3b82f6]"
                  : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  indicators.ema12 ? "bg-[#3b82f6]" : "bg-grey-600"
                )}
              />
              EMA 12
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator("ema26")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 font-medium text-xs transition-colors",
                indicators.ema26
                  ? "bg-[#ec4899]/20 text-[#ec4899]"
                  : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  indicators.ema26 ? "bg-[#ec4899]" : "bg-grey-600"
                )}
              />
              EMA 26
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator("bollingerBands")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 font-medium text-xs transition-colors",
                indicators.bollingerBands
                  ? "bg-[#6b7280]/20 text-[#9ca3af]"
                  : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  indicators.bollingerBands ? "bg-[#6b7280]" : "bg-grey-600"
                )}
              />
              BB
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator("rsi")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-0.5 font-medium text-xs transition-colors",
                indicators.rsi
                  ? "bg-[#a855f7]/20 text-[#a855f7]"
                  : "text-body-disabled hover:bg-grey-800 hover:text-body-secondary"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  indicators.rsi ? "bg-[#a855f7]" : "bg-grey-600"
                )}
              />
              RSI
            </button>
          </div>

          {/* Right side - Live indicator and time range */}
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-500" />
              </span>
              <span className="font-medium text-green-500 text-xs">Live</span>
            </div>

            {/* Time range buttons */}
            <div className="flex items-center gap-1">
              {TIME_RANGES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeRange(option.value)}
                  className={cn(
                    "rounded px-2.5 py-1 font-medium text-xs transition-colors",
                    timeRange === option.value
                      ? "bg-grey-700 text-white"
                      : "text-body-secondary hover:bg-grey-800 hover:text-body"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative">
          {/* TradingView logo */}
          <div className="pointer-events-none absolute bottom-12 left-4 z-10 flex items-center gap-1 opacity-50">
            <Icon icon="simple-icons:tradingview" className="size-5 text-white" />
          </div>

          <div ref={chartContainerRef} />
        </div>
      </div>
    </div>
  )
}
