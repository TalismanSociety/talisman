// ============================================================================
// Holders Overview Section
// ============================================================================

import { cn } from "@talismn/util"
import {
  useHolderDistribution,
  useSubnetPositions,
  useSubnetStakeEvents,
} from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import {
  getDaysPerPeriod,
  type TimePeriod,
} from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
import { AreaSeries, createChart, type UTCTimestamp } from "lightweight-charts"
import { type FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { formatCompactNumber, SectionTitleBar } from "./shared"

// 6-tier holder distribution colors
const HOLDER_COLORS = {
  megaWhale: "#f59e0b", // amber - 1M+ alpha
  whale: "#22d3ee", // cyan - 100K-1M alpha
  smallWhale: "#10b981", // emerald - 10K-100K alpha
  dolphin: "#a855f7", // purple - 1K-10K alpha
  fish: "#3b82f6", // blue - 100-1K alpha
  shrimp: "#6b7280", // gray - < 100 alpha
}

export const SignalsHolderOverview: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1W")
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const { data: positions, isLoading: positionsLoading } = useSubnetPositions(netuid)
  const { data: stakeEvents } = useSubnetStakeEvents(netuid)

  const days = useMemo(() => getDaysPerPeriod(period), [period])

  // Always fetch 30 days for chart data, period only affects metrics display
  const { data: holderDistribution, isLoading: distributionLoading } = useHolderDistribution(
    netuid,
    days
  )
  const isLoading = positionsLoading || distributionLoading

  // Filter distribution data based on selected period for metrics
  const filteredDistribution = useMemo(() => {
    if (!holderDistribution || holderDistribution.length === 0) return []
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    return holderDistribution.filter((d) => new Date(d.snapshotDate).getTime() >= cutoff)
  }, [holderDistribution, days])

  // Calculate top 10 concentration from positions data (alpha-based, not count-based)
  const top10Metrics = useMemo(() => {
    if (!positions) {
      return { top10Concentration: 0, concentrationLabel: "Unknown" }
    }

    const validPositions = positions.filter((p) => parseFloat(p.alphaBalance) > 0)
    const totalAlpha = validPositions.reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
    const top10Alpha = validPositions
      .slice(0, 10)
      .reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
    const top10Concentration = totalAlpha > 0 ? (top10Alpha / totalAlpha) * 100 : 0

    let concentrationLabel = "Distributed"
    if (top10Concentration >= 80) concentrationLabel = "Institution heavy"
    else if (top10Concentration >= 60) concentrationLabel = "Whale heavy"
    else if (top10Concentration >= 40) concentrationLabel = "Mixed"

    return { top10Concentration, concentrationLabel }
  }, [positions])

  const metrics = useMemo(() => {
    // Calculate avg trade from stake events
    const totalVolume = (stakeEvents ?? []).reduce(
      (sum, e) => sum + parseFloat(e.taoAmount) / 1e9,
      0
    )
    const avgTrade = stakeEvents && stakeEvents.length > 0 ? totalVolume / stakeEvents.length : 0

    if (!filteredDistribution || filteredDistribution.length === 0) {
      // Fallback to positions data if no distribution data available
      const validPositions = (positions ?? []).filter((p) => parseFloat(p.alphaBalance) > 0)
      return {
        totalHolders: validPositions.length,
        holderChange: 0,
        avgTrade,
      }
    }

    // Use the latest distribution data for metrics
    const latest = filteredDistribution[filteredDistribution.length - 1]
    const totalHolders = latest.totalHolders

    // Calculate holder change from filtered historical data
    let holderChange = 0
    if (filteredDistribution.length >= 2) {
      const oldest = filteredDistribution[0]
      holderChange = latest.totalHolders - oldest.totalHolders
    }

    return {
      totalHolders,
      holderChange,
      avgTrade,
    }
  }, [filteredDistribution, positions, stakeEvents])

  // Convert historical data to chart format with 6 tiers
  // Always use full 30-day data for chart to ensure proper rendering
  const chartData = useMemo(() => {
    if (!holderDistribution || holderDistribution.length === 0) {
      // Fallback to current positions data if no distribution data available
      if (!positions) return []

      const validPositions = positions.filter((p) => parseFloat(p.alphaBalance) > 0)
      const totalHolders = validPositions.length

      if (totalHolders === 0) return []

      // Categorize holders into 6 tiers
      let megaWhaleCount = 0
      let whaleCount = 0
      let smallWhaleCount = 0
      let dolphinCount = 0
      let fishCount = 0
      let shrimpCount = 0

      for (const pos of validPositions) {
        const balance = parseFloat(pos.alphaBalance) / 1e9
        if (balance >= 1000000) megaWhaleCount++
        else if (balance >= 100000) whaleCount++
        else if (balance >= 10000) smallWhaleCount++
        else if (balance >= 1000) dolphinCount++
        else if (balance >= 100) fishCount++
        else shrimpCount++
      }

      // Create multiple data points to make chart render properly
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      return Array.from({ length: 7 }, (_, i) => ({
        time: Math.floor((now - (6 - i) * dayMs) / 1000) as UTCTimestamp, // TODO looks hardcoded to some number of days
        megaWhale: (megaWhaleCount / totalHolders) * 100,
        whale: (whaleCount / totalHolders) * 100,
        smallWhale: (smallWhaleCount / totalHolders) * 100,
        dolphin: (dolphinCount / totalHolders) * 100,
        fish: (fishCount / totalHolders) * 100,
        shrimp: (shrimpCount / totalHolders) * 100,
      }))
    }

    // Use real historical data from the new GraphQL-backed endpoint
    return holderDistribution.map((day) => {
      const date = new Date(day.snapshotDate)
      const total = day.totalHolders || 1 // Avoid division by zero
      return {
        time: Math.floor(date.getTime() / 1000) as UTCTimestamp,
        megaWhale: ((day.holders1mPlus ?? 0) / total) * 100,
        whale: ((day.holders100kTo1m ?? 0) / total) * 100,
        smallWhale: ((day.holders10kTo100k ?? 0) / total) * 100,
        dolphin: ((day.holders1kTo10k ?? 0) / total) * 100,
        fish: ((day.holders100To1k ?? 0) / total) * 100,
        shrimp: ((day.holdersUnder100 ?? 0) / total) * 100,
      }
    })
  }, [holderDistribution, positions])

  // Create stacked area chart with 6 tiers
  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 150,
      layout: {
        background: { color: "transparent" },
        textColor: "#888888",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        visible: false,
      },
      crosshair: { mode: 0 },
      handleScroll: false,
      handleScale: false,
    })

    // Create stacked area data - each series stacks on top (bottom to top order)
    const shrimpData = chartData.map((d) => ({ time: d.time, value: d.shrimp }))
    const fishData = chartData.map((d) => ({ time: d.time, value: d.shrimp + d.fish }))
    const dolphinData = chartData.map((d) => ({
      time: d.time,
      value: d.shrimp + d.fish + d.dolphin,
    }))
    const smallWhaleData = chartData.map((d) => ({
      time: d.time,
      value: d.shrimp + d.fish + d.dolphin + d.smallWhale,
    }))
    const whaleData = chartData.map((d) => ({
      time: d.time,
      value: d.shrimp + d.fish + d.dolphin + d.smallWhale + d.whale,
    }))
    const megaWhaleData = chartData.map((d) => ({
      time: d.time,
      value: d.shrimp + d.fish + d.dolphin + d.smallWhale + d.whale + d.megaWhale,
    }))

    // Add series in reverse order (top to bottom for proper stacking)
    const megaWhaleSeries = chart.addSeries(AreaSeries, {
      lineColor: HOLDER_COLORS.megaWhale,
      topColor: `${HOLDER_COLORS.megaWhale}80`,
      bottomColor: `${HOLDER_COLORS.megaWhale}20`,
      lineWidth: 1,
    })
    megaWhaleSeries.setData(megaWhaleData)

    const whaleSeries = chart.addSeries(AreaSeries, {
      lineColor: HOLDER_COLORS.whale,
      topColor: `${HOLDER_COLORS.whale}80`,
      bottomColor: `${HOLDER_COLORS.whale}20`,
      lineWidth: 1,
    })
    whaleSeries.setData(whaleData)

    const smallWhaleSeries = chart.addSeries(AreaSeries, {
      lineColor: HOLDER_COLORS.smallWhale,
      topColor: `${HOLDER_COLORS.smallWhale}80`,
      bottomColor: `${HOLDER_COLORS.smallWhale}20`,
      lineWidth: 1,
    })
    smallWhaleSeries.setData(smallWhaleData)

    const dolphinSeries = chart.addSeries(AreaSeries, {
      lineColor: HOLDER_COLORS.dolphin,
      topColor: `${HOLDER_COLORS.dolphin}80`,
      bottomColor: `${HOLDER_COLORS.dolphin}20`,
      lineWidth: 1,
    })
    dolphinSeries.setData(dolphinData)

    const fishSeries = chart.addSeries(AreaSeries, {
      lineColor: HOLDER_COLORS.fish,
      topColor: `${HOLDER_COLORS.fish}80`,
      bottomColor: `${HOLDER_COLORS.fish}20`,
      lineWidth: 1,
    })
    fishSeries.setData(fishData)

    const shrimpSeries = chart.addSeries(AreaSeries, {
      lineColor: HOLDER_COLORS.shrimp,
      topColor: `${HOLDER_COLORS.shrimp}80`,
      bottomColor: `${HOLDER_COLORS.shrimp}20`,
      lineWidth: 1,
    })
    shrimpSeries.setData(shrimpData)

    chart.timeScale().fitContent()

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
  }, [chartData])

  if (isLoading) {
    return (
      <div className="rounded-xl bg-grey-900 p-5">
        <div className="h-64 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionTitleBar label={t("Holders Overview")} period={period} onPeriodChange={setPeriod} />

      <div className="rounded-xl bg-grey-900 p-5">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <span className="text-body-secondary text-xs">Total Holders</span>
            <div className="font-bold text-2xl text-white">
              {formatCompactNumber(metrics.totalHolders)}
            </div>
            {metrics.holderChange !== 0 && (
              <span
                className={cn("text-xs", metrics.holderChange > 0 ? "text-green" : "text-red-500")}
              >
                {metrics.holderChange > 0 ? "+" : ""}
                {metrics.holderChange}
              </span>
            )}
          </div>

          <div>
            <span className="text-body-secondary text-xs">Top 10 %</span>
            <div className="font-bold text-2xl text-white">
              {top10Metrics.top10Concentration.toFixed(0)}%
            </div>
            <span className="text-body-secondary text-xs">{top10Metrics.concentrationLabel}</span>
          </div>

          <div>
            <span className="text-body-secondary text-xs">Avg Trade</span>
            <div className="font-bold text-2xl text-white">{metrics.avgTrade.toFixed(1)}τ</div>
          </div>
        </div>

        {/* Legend - 6 tiers in two rows */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: "1M+ α", color: HOLDER_COLORS.megaWhale },
            { label: "100K-1M α", color: HOLDER_COLORS.whale },
            { label: "10K-100K α", color: HOLDER_COLORS.smallWhale },
            { label: "1K-10K α", color: HOLDER_COLORS.dolphin },
            { label: "100-1K α", color: HOLDER_COLORS.fish },
            { label: "< 100 α", color: HOLDER_COLORS.shrimp },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-body-secondary text-xs">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div ref={chartContainerRef} className="h-[150px] w-full" />

        {/* No data fallback message */}
        {(!holderDistribution || holderDistribution.length === 0) && (
          <div className="mt-2 text-center text-body-secondary text-xs">
            Historical data will appear once daily snapshots are available
          </div>
        )}
      </div>
    </div>
  )
}
