import { cn } from "@talismn/util"
import {
  AreaSeries,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts"
import type { FC } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { useSubnetStakeEvents } from "../../hooks/useSn45Api"

interface TaoFlowChartProps {
  netuid: number
  className?: string
}

interface ProcessedHourlyData {
  hour: Date
  hourStr: string
  taoIn: number
  taoOut: number
  taoInCumsum: number
  taoOutCumsum: number
  taoNetCumsum: number
}

interface TransactionInfo {
  coldkey: string
  tao: number
  method: "Adding" | "Removing"
}

interface SignificantFlowEvent {
  hourStr: string
  hour: Date
  direction: "inflow" | "outflow"
  magnitude: number
  taoInCumsum: number
  taoOutCumsum: number
  percentile: number
  txCount: number
  topTxs: TransactionInfo[]
}

function formatHour(date: Date): string {
  return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:00`
}

function formatNumber(num: number, decimals = 0): string {
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function formatSignalDate(date: Date): string {
  const now = new Date()
  const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  if (diffHours < 48) {
    return `Yesterday ${date.getHours()}:00`
  }
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${date.getHours()}:00`
}

function processStakeEventsToHourly(
  stakeEvents: Array<{
    method: "Adding" | "Removing"
    taoAmount: string
    coldkey: string
    timestamp: string
  }>
): { hourlyData: ProcessedHourlyData[]; totals: { taoIn: number; taoOut: number } } {
  if (stakeEvents.length === 0) {
    return { hourlyData: [], totals: { taoIn: 0, taoOut: 0 } }
  }

  // Group events by hour
  const hourlyMap = new Map<string, { hour: Date; taoIn: number; taoOut: number }>()

  for (const event of stakeEvents) {
    const ts = new Date(event.timestamp)
    const hourKey = new Date(Math.floor(ts.getTime() / 3600000) * 3600000)
    const hourStr = hourKey.toISOString()

    if (!hourlyMap.has(hourStr)) {
      hourlyMap.set(hourStr, { hour: hourKey, taoIn: 0, taoOut: 0 })
    }

    const entry = hourlyMap.get(hourStr)!
    const tao = parseFloat(event.taoAmount) / 1e9
    if (event.method === "Adding") {
      entry.taoIn += tao
    } else {
      entry.taoOut += tao
    }
  }

  // Sort and build cumulative data
  const hourlyEntries = Array.from(hourlyMap.entries()).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  )

  let taoInCumsum = 0
  let taoOutCumsum = 0

  const hourlyData: ProcessedHourlyData[] = hourlyEntries.map(([, data]) => {
    taoInCumsum += data.taoIn
    taoOutCumsum += data.taoOut

    return {
      hour: data.hour,
      hourStr: formatHour(data.hour),
      taoIn: data.taoIn,
      taoOut: data.taoOut,
      taoInCumsum,
      taoOutCumsum,
      taoNetCumsum: taoInCumsum - taoOutCumsum,
    }
  })

  return {
    hourlyData,
    totals: { taoIn: taoInCumsum, taoOut: taoOutCumsum },
  }
}

export const TaoFlowChart: FC<TaoFlowChartProps> = ({ netuid, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const { data: stakeEvents, isLoading } = useSubnetStakeEvents(netuid)

  const [showMarkersOnChart, setShowMarkersOnChart] = useState(true)
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null)

  // Process stake events into hourly data
  const { hourlyData, totals } = useMemo(() => {
    if (!stakeEvents) return { hourlyData: [], totals: { taoIn: 0, taoOut: 0 } }
    return processStakeEventsToHourly(stakeEvents)
  }, [stakeEvents])

  // Group stake events by hour for transaction details
  const txByHour = useMemo(() => {
    const map = new Map<string, TransactionInfo[]>()
    for (const e of stakeEvents ?? []) {
      const ts = new Date(e.timestamp)
      const hourKey = new Date(Math.floor(ts.getTime() / 3600000) * 3600000)
      const hourStr = formatHour(hourKey)
      if (!map.has(hourStr)) map.set(hourStr, [])
      map.get(hourStr)!.push({
        coldkey: e.coldkey ?? "unknown",
        tao: parseFloat(e.taoAmount) / 1e9,
        method: e.method,
      })
    }
    return map
  }, [stakeEvents])

  // Identify significant flow events
  const { signals } = useMemo(() => {
    if (hourlyData.length < 3) {
      return { signals: [] as SignificantFlowEvent[], signalSet: new Set<string>() }
    }

    const hourlyFlows = hourlyData.map((d) => ({
      hourStr: d.hourStr,
      hour: d.hour,
      netFlow: d.taoIn - d.taoOut,
      taoInCumsum: d.taoInCumsum,
      taoOutCumsum: d.taoOutCumsum,
    }))

    const nonZeroFlows = hourlyFlows.filter((h) => Math.abs(h.netFlow) > 0.1)
    if (nonZeroFlows.length === 0) {
      return { signals: [] as SignificantFlowEvent[], signalSet: new Set<string>() }
    }

    const magnitudes = nonZeroFlows.map((h) => Math.abs(h.netFlow)).sort((a, b) => a - b)
    const avgMag = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length

    const p90Index = Math.floor(magnitudes.length * 0.9)
    const p90Threshold = magnitudes[p90Index] ?? magnitudes[magnitudes.length - 1]
    const threshold = Math.max(p90Threshold, avgMag * 2, 5)

    const events: SignificantFlowEvent[] = []
    for (const h of hourlyFlows) {
      const mag = Math.abs(h.netFlow)
      if (mag >= threshold) {
        const rank = magnitudes.filter((m) => m <= mag).length
        const percentile = Math.round((rank / magnitudes.length) * 100)

        // Get transactions for this hour
        const hourTxs = txByHour.get(h.hourStr) ?? []
        // Filter by direction and sort by size
        const relevantTxs = hourTxs
          .filter((tx) => (h.netFlow >= 0 ? tx.method === "Adding" : tx.method === "Removing"))
          .sort((a, b) => b.tao - a.tao)

        events.push({
          hourStr: h.hourStr,
          hour: h.hour,
          direction: h.netFlow >= 0 ? "inflow" : "outflow",
          magnitude: mag,
          taoInCumsum: h.taoInCumsum,
          taoOutCumsum: h.taoOutCumsum,
          percentile,
          txCount: hourTxs.length,
          topTxs: relevantTxs.slice(0, 3),
        })
      }
    }

    events.sort((a, b) => b.hour.getTime() - a.hour.getTime())

    return {
      signals: events,
      signalSet: new Set(events.map((e) => e.hourStr)),
    }
  }, [hourlyData, txByHour])

  // Create chart
  useEffect(() => {
    if (!chartContainerRef.current || hourlyData.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
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
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#2a2a2a",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 1 },
    })

    // TAO In cumulative area
    const taoInSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(38, 166, 154, 0.4)",
      bottomColor: "rgba(38, 166, 154, 0.05)",
      lineColor: "#26a69a",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
    })

    // TAO Out cumulative area
    const taoOutSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(239, 83, 80, 0.4)",
      bottomColor: "rgba(239, 83, 80, 0.05)",
      lineColor: "#ef5350",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
    })

    // Net flow line
    const netFlowSeries = chart.addSeries(LineSeries, {
      color: "#2563eb",
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
    })

    const taoInData = hourlyData.map((d) => ({
      time: Math.floor(d.hour.getTime() / 1000) as UTCTimestamp,
      value: d.taoInCumsum,
    }))

    const taoOutData = hourlyData.map((d) => ({
      time: Math.floor(d.hour.getTime() / 1000) as UTCTimestamp,
      value: d.taoOutCumsum,
    }))

    const netFlowData = hourlyData.map((d) => ({
      time: Math.floor(d.hour.getTime() / 1000) as UTCTimestamp,
      value: d.taoNetCumsum,
    }))

    taoInSeries.setData(taoInData)
    taoOutSeries.setData(taoOutData)
    netFlowSeries.setData(netFlowData)

    // Add markers for significant signals if enabled
    // Note: createSeriesMarkers works with any series type
    if (showMarkersOnChart && signals.length > 0) {
      const inflowMarkers = signals
        .filter((s) => s.direction === "inflow")
        .map((s) => ({
          time: Math.floor(s.hour.getTime() / 1000) as UTCTimestamp,
          position: "aboveBar" as const,
          color: "#26a69a",
          shape: "arrowUp" as const,
          text: `+${s.magnitude.toFixed(0)}τ`,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))

      const outflowMarkers = signals
        .filter((s) => s.direction === "outflow")
        .map((s) => ({
          time: Math.floor(s.hour.getTime() / 1000) as UTCTimestamp,
          position: "belowBar" as const,
          color: "#ef5350",
          shape: "arrowDown" as const,
          text: `-${s.magnitude.toFixed(0)}τ`,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))

      // Add markers to the appropriate series
      if (inflowMarkers.length > 0) {
        createSeriesMarkers(taoInSeries, inflowMarkers)
      }
      if (outflowMarkers.length > 0) {
        createSeriesMarkers(taoOutSeries, outflowMarkers)
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
  }, [hourlyData, showMarkersOnChart, signals])

  const netTao = totals.taoIn - totals.taoOut

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-[400px] items-center justify-center rounded-lg bg-grey-900",
          className
        )}
      >
        <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
      </div>
    )
  }

  if (hourlyData.length === 0) {
    return (
      <div
        className={cn(
          "flex h-[400px] items-center justify-center rounded-lg bg-grey-900 text-body-secondary",
          className
        )}
      >
        No flow data available for this subnet.
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="font-medium text-body text-lg">Alpha Flow Signal Analysis</span>
        <span className="text-body-secondary text-xs">
          Cumulative TAO flow with significant movement signals
        </span>
      </div>

      {/* Chart Container */}
      <div className="relative overflow-hidden rounded-lg bg-grey-900">
        {/* Stats overlay */}
        <div className="absolute top-4 left-4 z-10 text-sm">
          <span className="text-[#26a69a]">Inflow Σ{formatNumber(totals.taoIn, 1)}τ</span>
          <span className="mx-2 text-body-secondary">|</span>
          <span className="text-[#ef5350]">Outflow Σ{formatNumber(totals.taoOut, 1)}τ</span>
          <span className="mx-2 text-body-secondary">|</span>
          <span className={netTao >= 0 ? "text-[#2563eb]" : "text-[#ef5350]"}>
            Net {netTao >= 0 ? "+" : ""}
            {formatNumber(netTao, 1)}τ
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3 rounded-lg bg-grey-800/90 px-3 py-1.5 text-[10px] text-body-secondary">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#26a69a]" />
            Inflow
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ef5350]" />
            Outflow
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-0.5 w-4 bg-[#2563eb]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #2563eb 0, #2563eb 4px, transparent 4px, transparent 8px)",
              }}
            />
            Net
          </span>
        </div>

        <div ref={chartContainerRef} />
      </div>

      {/* Signal Feed */}
      {signals.length > 0 && (
        <div className="rounded-lg border border-grey-750 bg-grey-850 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="font-medium text-body text-xs">Signals</span>
            <span className="rounded-full bg-grey-750 px-2 py-0.5 text-[10px] text-body-secondary">
              {signals.length}
            </span>
            <div className="flex-1" />
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-body-secondary">
              <input
                type="checkbox"
                checked={showMarkersOnChart}
                onChange={(e) => setShowMarkersOnChart(e.target.checked)}
                className="h-3 w-3 accent-primary"
              />
              Show on chart
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {signals.map((signal) => {
              const isExpanded = expandedSignal === signal.hourStr
              const signalColor = signal.direction === "inflow" ? "#26a69a" : "#ef5350"

              return (
                <button
                  type="button"
                  key={signal.hourStr}
                  className={cn(
                    "cursor-pointer rounded-lg border transition-all",
                    signal.direction === "inflow"
                      ? "border-[#26a69a]/30 bg-[#26a69a]/5"
                      : "border-[#ef5350]/30 bg-[#ef5350]/5",
                    isExpanded && "border-opacity-100"
                  )}
                  onClick={() => setExpandedSignal(isExpanded ? null : signal.hourStr)}
                >
                  {/* Compact header */}
                  <div className="flex items-center gap-2 px-2.5 py-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rotate-45"
                      style={{ backgroundColor: signalColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[11px]" style={{ color: signalColor }}>
                          {signal.direction === "inflow" ? "+" : "-"}
                          {signal.magnitude.toFixed(0)}τ
                        </span>
                        {signal.percentile >= 95 && (
                          <span
                            className="rounded px-1 py-0.5 font-medium text-[8px] text-white"
                            style={{ backgroundColor: signalColor }}
                          >
                            Top 5%
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-body-secondary">
                        {formatSignalDate(signal.hour)} · {signal.txCount} tx
                      </div>
                    </div>
                    <span
                      className="text-[10px] text-body-secondary transition-transform"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="space-y-1.5 border-grey-750 border-t px-2.5 py-2">
                      <div className="text-[10px] text-body-secondary">Top transactions:</div>
                      {signal.topTxs.length > 0 ? (
                        signal.topTxs.map((tx, i) => (
                          <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: TODO use tx hash
                            key={i}
                            className="flex items-center justify-between rounded bg-grey-800 px-1.5 py-1 text-[10px]"
                          >
                            <span className="font-mono text-body" title={tx.coldkey}>
                              {tx.coldkey.slice(0, 6)}...{tx.coldkey.slice(-4)}
                            </span>
                            <span className="font-medium" style={{ color: signalColor }}>
                              {tx.tao.toFixed(1)}τ
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-body-secondary italic">
                          No transaction details
                        </div>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
