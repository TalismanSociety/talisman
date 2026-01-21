import { Icon } from "@iconify/react"
import { cn } from "@talismn/util"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { AreaSeries, createChart, LineSeries, type UTCTimestamp } from "lightweight-charts"
import { type FC, useEffect, useMemo, useRef, useState } from "react"

import { useSubnetStakeEvents, useSubnetTokenomics } from "../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

interface SubnetTaoFlowChartProps {
  netuid: number
  className?: string
}

interface ProcessedFlowData {
  time: Date
  taoIn: number
  taoOut: number
  cumulativeTaoIn: number
  cumulativeTaoOut: number
  net: number
}

// Process stake events into cumulative flow data
function processStakeEventsToFlow(
  stakeEvents: Array<{
    method: "Adding" | "Removing"
    alphaAmount: string
    taoAmount: string
    timestamp: string
  }>
): ProcessedFlowData[] {
  if (stakeEvents.length === 0) return []

  // Process stake events
  const processedStakes = stakeEvents.map((e) => ({
    ...e,
    timestamp: new Date(e.timestamp),
    alpha: parseFloat(e.alphaAmount) / 1e9,
    tao: parseFloat(e.taoAmount) / 1e9,
  }))

  processedStakes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Group by hour and calculate cumulative values
  const hourlyMap = new Map<string, { time: Date; taoIn: number; taoOut: number }>()

  for (const stake of processedStakes) {
    const hour = new Date(Math.floor(stake.timestamp.getTime() / 3600000) * 3600000)
    const hourKey = hour.toISOString()

    if (!hourlyMap.has(hourKey)) {
      hourlyMap.set(hourKey, { time: hour, taoIn: 0, taoOut: 0 })
    }

    const entry = hourlyMap.get(hourKey)!
    if (stake.method === "Adding") {
      entry.taoIn += stake.tao
    } else {
      entry.taoOut += stake.tao
    }
  }

  // Sort by time and calculate cumulative values
  const hourlyEntries = Array.from(hourlyMap.values()).sort(
    (a, b) => a.time.getTime() - b.time.getTime()
  )

  let cumulativeTaoIn = 0
  let cumulativeTaoOut = 0

  return hourlyEntries.map((entry) => {
    cumulativeTaoIn += entry.taoIn
    cumulativeTaoOut += entry.taoOut
    return {
      time: entry.time,
      taoIn: entry.taoIn,
      taoOut: entry.taoOut,
      cumulativeTaoIn,
      cumulativeTaoOut,
      net: cumulativeTaoIn - cumulativeTaoOut,
    }
  })
}

const TIME_RANGES = [
  { label: "1D", value: 1 },
  { label: "1W", value: 7 },
  { label: "1M", value: 30 },
]

// Format numbers with K, M suffixes
const formatCompactNumber = (num: number, decimals = 1): string => {
  const absNum = Math.abs(num)
  if (absNum >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`
  if (absNum >= 1000) return `${(num / 1000).toFixed(decimals)}K`
  return num.toFixed(decimals)
}

// Format alpha with Ka suffix
const formatAlpha = (num: number): string => {
  const absNum = Math.abs(num)
  if (absNum >= 1000000) return `${(num / 1000000).toFixed(0)}Ma`
  if (absNum >= 1000) return `${(num / 1000).toFixed(0)}Ka`
  return `${num.toFixed(0)}a`
}

export const SubnetTaoFlowChart: FC<SubnetTaoFlowChartProps> = ({ netuid, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)

  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tokenomics } = useSubnetTokenomics(netuid)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const [timeRange, setTimeRange] = useState(7) // days - default to 1W

  const isLoading = stakeLoading

  // Get current subnet data
  const currentSubnet = useMemo(() => {
    return subnetData.find((s) => Number(s.netuid) === netuid)
  }, [subnetData, netuid])

  // Process all flow data
  const allFlowData = useMemo(() => {
    if (!stakeEvents) return []
    return processStakeEventsToFlow(stakeEvents)
  }, [stakeEvents])

  // Filter by time range
  const flowData = useMemo(() => {
    if (timeRange === 0) return allFlowData
    const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000
    return allFlowData.filter((d) => d.time.getTime() >= cutoff)
  }, [allFlowData, timeRange])

  // Calculate totals for the selected time range
  const totals = useMemo(() => {
    if (flowData.length === 0) {
      return { taoIn: 0, taoOut: 0, net: 0, alphaIn: 0, alphaOut: 0 }
    }

    const taoIn = flowData.reduce((sum, d) => sum + d.taoIn, 0)
    const taoOut = flowData.reduce((sum, d) => sum + d.taoOut, 0)

    return {
      taoIn,
      taoOut,
      net: taoIn - taoOut,
      alphaIn: 0, // Would need separate calculation
      alphaOut: 0,
    }
  }, [flowData])

  // Calculate alpha flow from tokenomics
  const alphaFlow = useMemo(() => {
    if (!tokenomics) return { alphaIn: 0, alphaOut: 0 }
    return {
      alphaIn: parseFloat(tokenomics.alphaIn) / 1e9,
      alphaOut: parseFloat(tokenomics.alphaOut) / 1e9,
    }
  }, [tokenomics])

  // EMA TAO flow
  const _emaTaoFlow = useMemo(() => {
    if (!tokenomics?.emaTaoFlow) return 0
    return parseFloat(tokenomics.emaTaoFlow) / 2 ** 64 / 1e9
  }, [tokenomics])

  // Emissions data
  const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null
  const dailyEmissions = emissionRaw
    ? (Number(emissionRaw) / 1e9) * (7200 / (currentSubnet?.tempo || 360))
    : null

  // Calculate emission percentage (relative to total network emissions)
  const emissionPercent = emissionRaw ? (Number(emissionRaw) / 1e9 / 1e9) * 100 : null

  // Distribution trend (based on net flow direction)
  const distributionTrend = totals.net >= 0 ? "accumulating" : "distributing"

  useEffect(() => {
    if (!chartContainerRef.current || flowData.length === 0) return

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { color: "#0d0d0d" },
        textColor: "#71717a",
      },
      grid: {
        vertLines: { color: "#27272a", style: 3 },
        horzLines: { color: "#27272a", style: 3 },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
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

    // Create TAO In area series (green)
    const taoInSeries = chart.addSeries(AreaSeries, {
      lineColor: "#22c55e",
      topColor: "rgba(34, 197, 94, 0.4)",
      bottomColor: "rgba(34, 197, 94, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${formatCompactNumber(price)}τ`,
      },
    })

    // Create TAO Out area series (red)
    const taoOutSeries = chart.addSeries(AreaSeries, {
      lineColor: "#ef4444",
      topColor: "rgba(239, 68, 68, 0.3)",
      bottomColor: "rgba(239, 68, 68, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${formatCompactNumber(price)}τ`,
      },
    })

    // Create Net line series (blue dashed)
    const netSeries = chart.addSeries(LineSeries, {
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${formatCompactNumber(price)}τ`,
      },
    })

    // Transform and set data
    const taoInData = flowData.map((d) => ({
      time: Math.floor(d.time.getTime() / 1000) as UTCTimestamp,
      value: d.cumulativeTaoIn,
    }))

    const taoOutData = flowData.map((d) => ({
      time: Math.floor(d.time.getTime() / 1000) as UTCTimestamp,
      value: d.cumulativeTaoOut,
    }))

    const netData = flowData.map((d) => ({
      time: Math.floor(d.time.getTime() / 1000) as UTCTimestamp,
      value: d.net,
    }))

    taoInSeries.setData(taoInData)
    taoOutSeries.setData(taoOutData)
    netSeries.setData(netData)

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
  }, [flowData])

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="h-16 w-48 animate-pulse rounded bg-grey-800" />
            <div className="h-8 w-64 animate-pulse rounded bg-grey-800" />
          </div>
          <div className="mt-4 flex h-[350px] items-center justify-center">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
          </div>
        </div>
      </div>
    )
  }

  if (flowData.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-3xl text-white">0τ Net</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-body-secondary">
                <span>EMA TAO flow</span>
                <span className="rounded bg-grey-800 px-2 py-0.5 text-xs">Distribution</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex h-[350px] items-center justify-center text-body-secondary">
            No flow data available for this subnet.
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
          {/* Left side - Net Flow Display */}
          <div>
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-bold text-3xl",
                  totals.net >= 0 ? "text-white" : "text-red-500"
                )}
              >
                {totals.net >= 0 ? "+" : ""}
                {formatCompactNumber(totals.net)}τ Net
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-body-secondary">
              <span>EMA TAO flow</span>
              <span
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
                  distributionTrend === "accumulating"
                    ? "bg-green-500/20 text-green-500"
                    : "bg-red-500/20 text-red-500"
                )}
              >
                {distributionTrend === "accumulating" ? "Distribution" : "Distribution"}
                <Icon
                  icon={
                    distributionTrend === "accumulating"
                      ? "mdi:arrow-bottom-right"
                      : "mdi:arrow-top-right"
                  }
                  className="size-3"
                />
              </span>
            </div>
          </div>

          {/* Right side - Stats */}
          <div className="flex flex-wrap items-start gap-6 text-sm">
            {/* TAO Flow */}
            <div className="flex flex-col">
              <span className="text-body-disabled text-xs">TAO Flow</span>
              <div className="flex flex-col">
                <span className="font-medium text-green-500">
                  {formatCompactNumber(totals.taoIn)}τ{" "}
                  <span className="text-body-disabled text-xs">In</span>
                </span>
                <span className="font-medium text-red-500">
                  {formatCompactNumber(totals.taoOut)}τ{" "}
                  <span className="text-body-disabled text-xs">Out</span>
                </span>
              </div>
            </div>

            {/* Alpha Flow */}
            <div className="flex flex-col">
              <span className="text-body-disabled text-xs">Alpha Flow</span>
              <div className="flex flex-col">
                <span className="font-medium text-green-500">
                  {formatAlpha(alphaFlow.alphaIn)}{" "}
                  <span className="text-body-disabled text-xs">In</span>
                </span>
                <span className="font-medium text-red-500">
                  {formatAlpha(alphaFlow.alphaOut)}{" "}
                  <span className="text-body-disabled text-xs">Out</span>
                </span>
              </div>
            </div>

            {/* Emissions */}
            <div className="flex flex-col items-end">
              <span className="text-body-disabled text-xs">Emissions</span>
              <span className="font-medium text-white">
                {emissionPercent !== null ? `${emissionPercent.toFixed(2)}%` : "—"}
              </span>
            </div>

            {/* Em/Day */}
            <div className="flex flex-col items-end">
              <span className="text-body-disabled text-xs">Em/Day</span>
              <span className="font-medium text-white">
                {dailyEmissions !== null ? `τ${dailyEmissions.toFixed(2)}` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Legend and Time selector row */}
        <div className="flex items-center justify-between px-6 pb-2">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-green-500" />
              <span className="text-body-secondary">Tao in</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-red-500" />
              <span className="text-body-secondary">Tao out</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 border-blue-500 border-t-2 border-dashed" />
              <span className="text-body-secondary">Net</span>
            </span>
          </div>

          {/* Right side controls */}
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
          <div ref={chartContainerRef} />
        </div>
      </div>
    </div>
  )
}
