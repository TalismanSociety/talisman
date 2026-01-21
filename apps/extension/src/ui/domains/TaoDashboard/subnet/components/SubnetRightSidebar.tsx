import { Icon } from "@iconify/react"
import { cn } from "@talismn/util"
import { AreaSeries, createChart, type UTCTimestamp } from "lightweight-charts"
import { type FC, useEffect, useMemo, useRef, useState } from "react"
import {
  useSubnetDailyTrend,
  useSubnetEconomicsWithSentiment,
  useSubnetHolderHistory,
  useSubnetPositions,
  useSubnetStakeEvents,
  useSubnetStakeSnapshots,
  useSubnetTokenomics,
  useSubnetTweets,
  useTaoPrice,
} from "../../hooks/useSn45Api"

interface SubnetRightSidebarProps {
  netuid: number
  className?: string
}

// ============================================================================
// Types
// ============================================================================

type TabType = "signals" | "social" | "whale"
type TimePeriod = "1D" | "1W" | "1M"

// ============================================================================
// Utility Functions
// ============================================================================

const formatNumber = (num: number, decimals = 0): string => {
  if (num === 0) return "0"
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(decimals)
}

const formatCompactNumber = (num: number): string => {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case "very_bullish":
      return "bg-green text-white"
    case "bullish":
      return "bg-green/70 text-white"
    case "neutral":
      return "bg-grey-600 text-white"
    case "bearish":
      return "bg-red-400 text-white"
    case "very_bearish":
      return "bg-red-500 text-white"
    default:
      return "bg-grey-600 text-white"
  }
}

const getSentimentLabel = (score: number) => {
  if (score >= 80) {
    return "Very Bullish"
  } else if (score >= 60) {
    return "Bullish"
  } else if (score >= 40) {
    return "Neutral"
  } else if (score >= 20) {
    return "Bearish"
  } else {
    return "Very Bearish"
  }
}

const getSentimentLabelFromString = (sentiment: string) => {
  switch (sentiment) {
    case "very_bullish":
      return "Very Bullish"
    case "bullish":
      return "Bullish"
    case "neutral":
      return "Neutral"
    case "bearish":
      return "Bearish"
    case "very_bearish":
      return "Very Bearish"
    default:
      return "Unknown"
  }
}

// ============================================================================
// Tab Selector Component
// ============================================================================

const TabSelector: FC<{
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}> = ({ activeTab, onTabChange }) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: "signals", label: "Signals" },
    { id: "social", label: "Social Feeds" },
    { id: "whale", label: "Whale Activity" },
  ]

  return (
    <div className="flex items-center rounded-full border border-grey-700 bg-grey-900 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "rounded-full px-4 py-2 font-medium text-sm transition-colors",
            activeTab === tab.id ? "bg-grey-750 text-white" : "text-body-secondary hover:text-body"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Time Period Selector Component
// ============================================================================

const TimePeriodSelector: FC<{
  value: TimePeriod
  onChange: (period: TimePeriod) => void
  className?: string
}> = ({ value, onChange, className }) => {
  const periods: TimePeriod[] = ["1D", "1W", "1M"]

  return (
    <div className={cn("flex items-center rounded-lg bg-grey-800 p-0.5", className)}>
      {periods.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          className={cn(
            "rounded-md px-3 py-1 font-medium text-xs transition-colors",
            value === period ? "bg-grey-600 text-white" : "text-body-secondary hover:text-body"
          )}
        >
          {period}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Sentiment Gauge Component (SVG-based semi-circular fuel gauge)
// ============================================================================

const SentimentGauge: FC<{
  score: number // 0-100
  label: string
}> = ({ score, label }) => {
  // Calculate needle rotation: -90deg (left/red) to 90deg (right/green)
  const needleRotation = (score / 100) * 180 - 90

  // Designed for compact in-panel display: fits in card, not full page
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 120,
        padding: "0 4px",
      }}
    >
      {/* Title */}
      {/* <div
        style={{
          color: '#808080',
          fontSize: 11,
          fontWeight: 400,
          marginBottom: 4,
          letterSpacing: '0.5px',
          lineHeight: 1,
        }}
      >
        Sentiment
      </div> */}

      {/* Gauge SVG Container */}
      <div style={{ width: 160, height: 150, position: "relative" }}>
        <svg
          viewBox="0 0 100 68"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        >
          <defs>
            <linearGradient id="gaugeGradientMini" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e63946" />
              <stop offset="25%" stopColor="#f4a261" />
              <stop offset="50%" stopColor="#e9c46a" />
              <stop offset="75%" stopColor="#a7c957" />
              <stop offset="100%" stopColor="#2a9d3f" />
            </linearGradient>
            <radialGradient id="ballGradientMini" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#444" />
              <stop offset="100%" stopColor="#222" />
            </radialGradient>
            <filter id="dialShadowMini" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="2"
                floodColor="#000000"
                floodOpacity="0.45"
              />
            </filter>
          </defs>
          {/* Half-arc (gauge) */}
          <path
            d="M 13 53 A 37 37 0 0 1 87 53"
            fill="none"
            stroke="url(#gaugeGradientMini)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Needle - wide pointer */}
          <g transform={`rotate(${needleRotation}, 50, 53)`}>
            <polygon points="50,20 44,53 56,53" fill="#2d2d2d" />
          </g>
          {/* Center dial ball with drop shadow */}
          <circle cx="50" cy="53" r="20" fill="#2d2d2d" filter="url(#dialShadowMini)" />
          <circle cx="50" cy="53" r="20" fill="url(#ballGradientMini)" />
          {/* Score number */}
          <text
            x="50"
            y="57"
            textAnchor="middle"
            fill="#fff"
            fontSize="17"
            fontWeight="700"
            fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
            style={{ letterSpacing: "-1px" }}
          >
            {Math.round(score)}
          </text>
        </svg>
      </div>
      {/* Sentiment Label */}
      <div
        style={{
          color: "#fff",
          fontSize: 15,
          fontWeight: 400,
          lineHeight: "21px",
          marginTop: 0,
          textAlign: "center",
          width: "100%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {label}
      </div>
    </div>
  )
}

// ============================================================================
// Progress Bar Component
// ============================================================================

const _ProgressBar: FC<{
  value: number
  max: number
  color: "red" | "green"
  className?: string
}> = ({ value, max, color, className }) => {
  const percentage = max > 0 ? (value / max) * 100 : 0

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-grey-700", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          color === "red" ? "bg-red-500" : "bg-green"
        )}
        style={{ width: `${Math.min(100, percentage)}%` }}
      />
    </div>
  )
}

// ============================================================================
// Trending Sentiment Section
// ============================================================================

const TrendingSentimentSection: FC<{ netuid: number }> = ({ netuid }) => {
  const [_period, _setPeriod] = useState<TimePeriod>("1W")
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)
  const { data: economics, isLoading: economicsLoading } = useSubnetEconomicsWithSentiment()
  const economicsData = economics?.[netuid]
  const isLoading = tokenomicsLoading || economicsLoading

  const alphaFlow = useMemo(() => {
    if (!tokenomics) return 0
    const alphaIn = parseFloat(tokenomics.alphaIn) / 1e9
    const alphaOut = parseFloat(tokenomics.alphaOut) / 1e9
    return alphaIn - alphaOut
  }, [tokenomics])

  const EMA = useMemo(() => {
    if (!tokenomics?.emaTaoFlow) return 0
    return parseFloat(tokenomics.emaTaoFlow) / 2 ** 64 / 1e9
  }, [tokenomics])

  if (isLoading) {
    return (
      <div className="rounded-xl bg-grey-900 p-5">
        <div className="h-40 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg text-white">Trending sentiment</h3>
        {/* <TimePeriodSelector value={period} onChange={setPeriod} /> */}
      </div>

      <div className="rounded-xl bg-grey-900 p-5">
        <div className="flex items-stretch gap-6">
          {/* Left: Gauge */}
          <div className="flex flex-col items-center">
            <span className="mb-1 text-body-secondary text-xs">Sentiment Score</span>
            <SentimentGauge
              score={
                economicsData?.sentimentScore !== undefined
                  ? Math.round(((economicsData.sentimentScore + 2) / 4) * 100)
                  : 0
              }
              label={getSentimentLabel(
                economicsData?.sentimentScore !== undefined
                  ? Math.round(((economicsData.sentimentScore + 2) / 4) * 100)
                  : 0
              )}
            />
          </div>

          {/* Vertical Divider */}
          <div className="w-px self-stretch bg-grey-700" />

          {/* Right: Metrics */}
          <div className="flex flex-1 flex-col justify-center space-y-4">
            <div>
              <span className="text-body-secondary text-xs">Alpha Flow</span>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "font-bold text-lg",
                    alphaFlow >= 0 ? "text-green" : "text-red-500"
                  )}
                >
                  {formatCompactNumber(Math.abs(alphaFlow))}α
                </span>
                <Icon
                  icon={alphaFlow >= 0 ? "mdi:arrow-top-right" : "mdi:arrow-bottom-right"}
                  className={cn("size-5", alphaFlow >= 0 ? "text-green" : "text-red-500")}
                />
              </div>
            </div>

            <div>
              <span className="text-body-secondary text-xs">EMA</span>
              <div className={cn("font-bold text-lg", EMA >= 0 ? "text-green" : "text-red-500")}>
                {EMA >= 0 ? "+" : ""}
                {EMA.toFixed(2)}
              </div>
            </div>

            <div>
              {/* <span className="text-body-secondary text-xs">Combined Score</span>
              <div
                className={cn(
                  "font-bold text-2xl",
                  combineScore === "Bullish"
                    ? "text-green"
                    : combineScore === "Bearish"
                      ? "text-red-500"
                      : "text-white"
                )}
              >
                {combineScore}
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Trade Flow Section
// ============================================================================

// Comparison bar showing two values side by side
const ComparisonBar: FC<{
  leftValue: number
  rightValue: number
  className?: string
}> = ({ leftValue, rightValue, className }) => {
  const total = leftValue + rightValue
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50
  const rightPercent = total > 0 ? (rightValue / total) * 100 : 50

  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden rounded-full", className)}>
      <div className="h-full bg-red-500 transition-all" style={{ width: `${leftPercent}%` }} />
      <div className="h-full bg-green transition-all" style={{ width: `${rightPercent}%` }} />
    </div>
  )
}

const TradeFlowSection: FC<{ netuid: number }> = ({ netuid }) => {
  const [period, setPeriod] = useState<TimePeriod>("1W")
  const { data: stakeEvents, isLoading } = useSubnetStakeEvents(netuid)

  const metrics = useMemo(() => {
    if (!stakeEvents) {
      return {
        buys: 0,
        sells: 0,
        buyVol: 0,
        sellVol: 0,
        ratio: 1,
        ratioLabel: "Balanced",
        activeTraders: 0,
        buyers: 0,
        sellers: 0,
        avgTrade: 0,
        avgTradeLabel: "Retail flow",
      }
    }

    const now = Date.now()
    const periodMs =
      period === "1D"
        ? 24 * 60 * 60 * 1000
        : period === "1W"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000

    const filtered = stakeEvents.filter((e) => new Date(e.timestamp).getTime() > now - periodMs)

    const buys = filtered.filter((e) => e.method === "Adding")
    const sells = filtered.filter((e) => e.method === "Removing")

    const buyVol = buys.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)
    const sellVol = sells.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)

    const ratio = sellVol > 0 ? buyVol / sellVol : buyVol > 0 ? 999 : 1

    const buyAddresses = new Set(buys.map((e) => e.coldkey).filter(Boolean))
    const sellAddresses = new Set(sells.map((e) => e.coldkey).filter(Boolean))
    const allAddresses = new Set([...buyAddresses, ...sellAddresses])

    const totalVol = buyVol + sellVol
    const avgTrade = filtered.length > 0 ? totalVol / filtered.length : 0

    let ratioLabel = "Balanced"
    if (ratio >= 1.2) ratioLabel = "Bullish"
    else if (ratio <= 0.8) ratioLabel = "Bearish"

    const avgTradeLabel = avgTrade >= 10 ? "Whale flow" : "Retail flow"

    return {
      buys: buys.length,
      sells: sells.length,
      buyVol,
      sellVol,
      ratio,
      ratioLabel,
      activeTraders: allAddresses.size,
      buyers: buyAddresses.size,
      sellers: sellAddresses.size,
      avgTrade,
      avgTradeLabel,
    }
  }, [stakeEvents, period])

  if (isLoading) {
    return (
      <div className="rounded-xl bg-grey-900 p-5">
        <div className="h-48 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg text-white">Trade Flow</h3>
        <TimePeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="rounded-xl bg-grey-900 p-5">
        <div className="flex gap-6">
          {/* Left Section - Paired Metrics */}
          <div className="flex-1 space-y-6">
            {/* Buys / Sells Row */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-body-secondary text-xs">Buys</span>
                  <div className="font-bold text-lg text-white">{metrics.buys}</div>
                </div>
                <div className="text-right">
                  <span className="text-body-secondary text-xs">Sells</span>
                  <div className="font-bold text-lg text-white">{metrics.sells}</div>
                </div>
              </div>
              <ComparisonBar leftValue={metrics.buys} rightValue={metrics.sells} className="mt-2" />
            </div>

            {/* Buy Vol / Sells Vol Row */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-body-secondary text-xs">Buy Vol</span>
                  <div className="font-bold text-lg">τ{formatNumber(metrics.buyVol, 0)}</div>
                </div>
                <div className="text-right">
                  <span className="text-body-secondary text-xs">Sells Vol</span>
                  <div className="font-bold text-lg">τ{formatNumber(metrics.sellVol, 0)}</div>
                </div>
              </div>
              <ComparisonBar
                leftValue={metrics.buyVol}
                rightValue={metrics.sellVol}
                className="mt-2"
              />
            </div>

            {/* Buyers / Sellers Row */}
            <div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-body-secondary text-xs">Buyers</span>
                  <div className="font-bold text-lg text-white">{metrics.buyers}</div>
                </div>
                <div className="text-right">
                  <span className="text-body-secondary text-xs">Sellers</span>
                  <div className="font-bold text-lg text-white">{metrics.sellers}</div>
                </div>
              </div>
              <ComparisonBar
                leftValue={metrics.buyers}
                rightValue={metrics.sellers}
                className="mt-2"
              />
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px self-stretch bg-grey-700" />

          {/* Right Section - Summary Stats */}
          <div className="flex flex-col justify-between space-y-6">
            <div>
              <span className="text-body-secondary text-xs">Ratio</span>
              <div className="font-bold text-md text-white">{metrics.ratio.toFixed(2)}</div>
              <span className="text-body-secondary text-xs">{metrics.ratioLabel}</span>
            </div>

            <div>
              <span className="text-body-secondary text-xs">Active Traders</span>
              <div className="font-bold text-md text-white">{metrics.activeTraders}</div>
              <span className="text-body-secondary text-xs">Unique Wallets</span>
            </div>

            <div>
              <span className="text-body-secondary text-xs">Avg Trade</span>
              <div className="font-bold text-md text-white">{metrics.avgTrade.toFixed(1)}τ</div>
              <span className="text-body-secondary text-xs">{metrics.avgTradeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Holders Overview Section
// ============================================================================

const HOLDER_COLORS = {
  whale: "#22d3ee", // cyan
  dolphin: "#a855f7", // purple
  fish: "#3b82f6", // blue
  shrimp: "#581c87", // dark purple
}

const HoldersOverviewSection: FC<{ netuid: number }> = ({ netuid }) => {
  const [period, setPeriod] = useState<TimePeriod>("1W")
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const { data: positions, isLoading: positionsLoading } = useSubnetPositions(netuid)
  const { data: stakeEvents } = useSubnetStakeEvents(netuid)

  // Calculate the number of days based on period
  const days = period === "1D" ? 1 : period === "1W" ? 7 : 30
  const { data: holderHistory, isLoading: historyLoading } = useSubnetHolderHistory(netuid, days)
  const isLoading = positionsLoading || historyLoading

  const metrics = useMemo(() => {
    if (!positions) {
      return {
        totalHolders: 0,
        holderChange: 0,
        top10Concentration: 0,
        concentrationLabel: "Unknown",
        avgTrade: 0,
      }
    }

    const validPositions = positions.filter((p) => parseFloat(p.alphaBalance) > 0)
    const totalHolders = validPositions.length

    const totalAlpha = validPositions.reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
    const top10Alpha = validPositions
      .slice(0, 10)
      .reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
    const top10Concentration = totalAlpha > 0 ? (top10Alpha / totalAlpha) * 100 : 0

    let concentrationLabel = "Distributed"
    if (top10Concentration >= 80) concentrationLabel = "Institution heavy"
    else if (top10Concentration >= 60) concentrationLabel = "Whale heavy"
    else if (top10Concentration >= 40) concentrationLabel = "Mixed"

    // Calculate avg trade from stake events
    const totalVolume = (stakeEvents ?? []).reduce(
      (sum, e) => sum + parseFloat(e.taoAmount) / 1e9,
      0
    )
    const avgTrade = stakeEvents && stakeEvents.length > 0 ? totalVolume / stakeEvents.length : 0

    // Calculate holder change from historical data
    let holderChange = 0
    if (holderHistory && holderHistory.length >= 2) {
      const oldest = holderHistory[0]
      const newest = holderHistory[holderHistory.length - 1]
      holderChange = newest.totalHolders - oldest.totalHolders
    }

    return {
      totalHolders,
      holderChange,
      top10Concentration,
      concentrationLabel,
      avgTrade,
    }
  }, [positions, stakeEvents, holderHistory])

  // Convert historical data to chart format
  const chartData = useMemo(() => {
    if (!holderHistory || holderHistory.length === 0) {
      // Fallback to current positions data if no historical data available
      if (!positions) return []

      const validPositions = positions.filter((p) => parseFloat(p.alphaBalance) > 0)
      const totalAlpha = validPositions.reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)

      // Categorize holders
      let whaleAlpha = 0
      let dolphinAlpha = 0
      let fishAlpha = 0
      let shrimpAlpha = 0

      for (const pos of validPositions) {
        const balance = parseFloat(pos.alphaBalance) / 1e9
        if (balance >= 10000) whaleAlpha += parseFloat(pos.alphaBalance)
        else if (balance >= 1000) dolphinAlpha += parseFloat(pos.alphaBalance)
        else if (balance >= 100) fishAlpha += parseFloat(pos.alphaBalance)
        else shrimpAlpha += parseFloat(pos.alphaBalance)
      }

      // Return a single data point for current state
      const now = new Date()
      return [
        {
          time: Math.floor(now.getTime() / 1000) as UTCTimestamp,
          whale: totalAlpha > 0 ? (whaleAlpha / totalAlpha) * 100 : 0,
          dolphin: totalAlpha > 0 ? (dolphinAlpha / totalAlpha) * 100 : 0,
          fish: totalAlpha > 0 ? (fishAlpha / totalAlpha) * 100 : 0,
          shrimp: totalAlpha > 0 ? (shrimpAlpha / totalAlpha) * 100 : 0,
        },
      ]
    }

    // Use real historical data from API
    return holderHistory.map((day) => {
      const date = new Date(day.date)
      return {
        time: Math.floor(date.getTime() / 1000) as UTCTimestamp,
        whale: day.whalePercent,
        dolphin: day.dolphinPercent,
        fish: day.fishPercent,
        shrimp: day.shrimpPercent,
      }
    })
  }, [holderHistory, positions])

  // Create stacked area chart
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

    // Create stacked area data - each series stacks on top
    const shrimpData = chartData.map((d) => ({ time: d.time, value: d.shrimp }))
    const fishData = chartData.map((d) => ({ time: d.time, value: d.shrimp + d.fish }))
    const dolphinData = chartData.map((d) => ({
      time: d.time,
      value: d.shrimp + d.fish + d.dolphin,
    }))
    const whaleData = chartData.map((d) => ({
      time: d.time,
      value: d.shrimp + d.fish + d.dolphin + d.whale,
    }))

    // Add series in reverse order (bottom to top)
    const whaleSeries = chart.addSeries(AreaSeries, {
      lineColor: HOLDER_COLORS.whale,
      topColor: `${HOLDER_COLORS.whale}80`,
      bottomColor: `${HOLDER_COLORS.whale}20`,
      lineWidth: 1,
    })
    whaleSeries.setData(whaleData)

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
  console.log(holderHistory)
  if (isLoading) {
    return (
      <div className="rounded-xl bg-grey-900 p-5">
        <div className="h-64 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg text-white">Holders Overview</h3>
        <TimePeriodSelector value={period} onChange={setPeriod} />
      </div>

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
            <span className="text-body-secondary text-xs">Top 10 Concentration</span>
            <div className="font-bold text-2xl text-white">
              {metrics.top10Concentration.toFixed(0)}%
            </div>
            <span className="text-body-secondary text-xs">{metrics.concentrationLabel}</span>
          </div>

          <div>
            <span className="text-body-secondary text-xs">Avg Trade</span>
            <div className="font-bold text-2xl text-white">{metrics.avgTrade.toFixed(1)}τ</div>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 flex items-center gap-4">
          {[
            { label: "Whale (10K+)", color: HOLDER_COLORS.whale },
            { label: "Dolphin (1K+)", color: HOLDER_COLORS.dolphin },
            { label: "Fish (100+)", color: HOLDER_COLORS.fish },
            { label: "Shrimp", color: HOLDER_COLORS.shrimp },
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
        {(!holderHistory || holderHistory.length === 0) && (
          <div className="mt-2 text-center text-body-secondary text-xs">
            Historical data will appear once daily snapshots are available
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Social Feeds Section
// ============================================================================

const SocialFeedsSection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: tweets, isLoading: tweetsLoading } = useSubnetTweets(netuid, 20)
  const { data: dailyTrend, isLoading: trendLoading } = useSubnetDailyTrend(netuid)

  const isLoading = tweetsLoading || trendLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-12 animate-pulse rounded-lg bg-grey-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-24 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  const sentimentSummary = dailyTrend?.reduce(
    (acc, day) => ({
      total: acc.total + day.total,
      veryBullish: acc.veryBullish + day.veryBullish,
      bullish: acc.bullish + day.bullish,
      neutral: acc.neutral + day.neutral,
      bearish: acc.bearish + day.bearish,
      veryBearish: acc.veryBearish + day.veryBearish,
    }),
    { total: 0, veryBullish: 0, bullish: 0, neutral: 0, bearish: 0, veryBearish: 0 }
  )

  const sentimentScore = sentimentSummary?.total
    ? (sentimentSummary.veryBullish * 2 +
        sentimentSummary.bullish * 1 +
        sentimentSummary.bearish * -1 +
        sentimentSummary.veryBearish * -2) /
      sentimentSummary.total
    : 0

  return (
    <div className="flex flex-col gap-4">
      {/* Sentiment Score Bar */}
      <div className="flex items-center justify-between rounded-lg bg-grey-800/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-body-secondary text-xs">30-Day Score</span>
          <span className="text-grey-600 text-xs">({sentimentSummary?.total ?? 0} posts)</span>
        </div>
        <div
          className={cn(
            "font-bold text-base",
            sentimentScore >= 0.3
              ? "text-green"
              : sentimentScore <= -0.3
                ? "text-red-500"
                : "text-body"
          )}
        >
          {sentimentScore >= 0 ? "+" : ""}
          {sentimentScore.toFixed(2)}
        </div>
      </div>

      {/* Tweet List */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {tweets?.slice(0, 8).map((tweet) => (
          <a
            key={tweet.id}
            href={tweet.url || `https://twitter.com/i/status/${tweet.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-3 rounded-lg border border-grey-750 bg-grey-800/30 p-4 transition-colors hover:border-grey-600"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {tweet.author.profileImage ? (
                  <img
                    src={tweet.author.profileImage}
                    alt={tweet.author.name}
                    className="size-8 rounded-full"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-grey-700 font-bold text-sm">
                    {tweet.author.screenName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className="text-body-secondary text-sm">@{tweet.author.screenName}</span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 font-medium text-xs",
                  getSentimentColor(tweet.sentiment)
                )}
              >
                {getSentimentLabelFromString(tweet.sentiment)}
              </span>
            </div>
            <p className="line-clamp-3 text-body-secondary text-sm leading-relaxed">{tweet.text}</p>
            <div className="flex items-center justify-between text-grey-600 text-sm">
              <span>{formatTimeAgo(tweet.createdAt)}</span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100">View →</span>
            </div>
          </a>
        ))}
        {(!tweets || tweets.length === 0) && (
          <div className="py-4 text-center text-body-secondary text-sm">No posts found</div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Whale Activity Section
// ============================================================================

const formatUsd = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const truncateAddress = (address: string): string => {
  if (!address || address.length < 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const WhaleActivitySection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: snapshots, isLoading } = useSubnetStakeSnapshots(netuid, 7, 50)
  const { data: taoPrice } = useTaoPrice()
  const { data: tokenomics } = useSubnetTokenomics(netuid)

  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0
  const alphaPrice = tokenomics?.movingPrice ? parseFloat(tokenomics.movingPrice) / 1e18 : 0

  const { whaleActivity, totalBuys, totalSells } = useMemo(() => {
    if (!snapshots || snapshots.length === 0)
      return { whaleActivity: [], totalBuys: 0, totalSells: 0 }

    // Group snapshots by coldkey and sort by date
    const snapshotsByWallet = new Map<
      string,
      { coldkey: string; hotkey: string; snapshots: typeof snapshots }
    >()

    for (const snapshot of snapshots) {
      const key = `${snapshot.coldkey}-${snapshot.hotkey}`
      if (!snapshotsByWallet.has(key)) {
        snapshotsByWallet.set(key, {
          coldkey: snapshot.coldkey,
          hotkey: snapshot.hotkey,
          snapshots: [],
        })
      }
      snapshotsByWallet.get(key)?.snapshots.push(snapshot)
    }

    // Calculate stake changes for each wallet
    const activity: {
      id: string
      coldkey: string
      hotkey: string
      netuid: number
      change: number
      currentAmount: number
      timestamp: string
      isBuy: boolean
    }[] = []

    for (const [key, wallet] of snapshotsByWallet) {
      // Sort snapshots by date (oldest first)
      const sorted = wallet.snapshots.sort(
        (a, b) => new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
      )

      if (sorted.length >= 2) {
        // Compare most recent snapshot with previous
        const latest = sorted[sorted.length - 1]
        const previous = sorted[sorted.length - 2]
        const latestAmount = parseFloat(latest.amount) / 1e9
        const previousAmount = parseFloat(previous.amount) / 1e9
        const change = latestAmount - previousAmount

        // Only include significant changes (> 50 TAO equivalent)
        if (Math.abs(change) * alphaPrice >= 50) {
          activity.push({
            id: key,
            coldkey: wallet.coldkey,
            hotkey: wallet.hotkey,
            netuid: latest.netuid,
            change,
            currentAmount: latestAmount,
            timestamp: latest.timestamp,
            isBuy: change > 0,
          })
        }
      } else if (sorted.length === 1) {
        // New position - treat as a buy
        const snapshot = sorted[0]
        const amount = parseFloat(snapshot.amount) / 1e9
        if (amount * alphaPrice >= 50) {
          activity.push({
            id: key,
            coldkey: wallet.coldkey,
            hotkey: wallet.hotkey,
            netuid: snapshot.netuid,
            change: amount,
            currentAmount: amount,
            timestamp: snapshot.timestamp,
            isBuy: true,
          })
        }
      }
    }

    // Sort by timestamp (most recent first) and limit
    const sortedActivity = activity
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)

    // Calculate totals for flow bar
    const buys = sortedActivity.filter((a) => a.isBuy)
    const sells = sortedActivity.filter((a) => !a.isBuy)
    const totalBuysVol = buys.reduce((sum, a) => sum + Math.abs(a.change) * alphaPrice, 0)
    const totalSellsVol = sells.reduce((sum, a) => sum + Math.abs(a.change) * alphaPrice, 0)

    return {
      whaleActivity: sortedActivity,
      totalBuys: totalBuysVol,
      totalSells: totalSellsVol,
    }
  }, [snapshots, alphaPrice])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-20 animate-pulse rounded-lg bg-grey-800" />
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-16 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (whaleActivity.length === 0) {
    return (
      <div className="py-8 text-center text-body-secondary text-sm">
        No whale activity found for this subnet
      </div>
    )
  }

  const totalFlow = totalBuys + totalSells
  const buyPercent = totalFlow > 0 ? (totalBuys / totalFlow) * 100 : 50
  const sellPercent = totalFlow > 0 ? (totalSells / totalFlow) * 100 : 50

  return (
    <div className="flex flex-col gap-3">
      {/* Total Flow Header */}
      <div className="rounded-lg bg-grey-900 p-4">
        <div className="mb-3 font-medium text-white">Total Flow</div>
        <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full">
          <div className="h-full bg-red-500 transition-all" style={{ width: `${buyPercent}%` }} />
          <div className="h-full bg-green transition-all" style={{ width: `${sellPercent}%` }} />
        </div>
        <div className="flex justify-between text-body-secondary text-xs">
          <span>Buys</span>
          <span>Sells</span>
        </div>
      </div>

      {/* Activity List */}
      {whaleActivity.map((item) => {
        const taoValue = Math.abs(item.change) * alphaPrice
        const usdValue = taoValue * taoUsdPrice

        return (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl bg-grey-900 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  item.isBuy ? "bg-green" : "bg-red-500"
                )}
              >
                <Icon
                  icon={item.isBuy ? "mdi:arrow-down" : "mdi:arrow-up"}
                  className="size-5 text-white"
                />
              </div>
              <div>
                <div className="font-medium text-sm text-white">
                  {truncateAddress(item.coldkey)}
                </div>
                <div className="text-body-secondary text-xs">
                  SN{item.netuid} &nbsp; {formatTimeAgo(item.timestamp)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn("font-medium text-sm", item.isBuy ? "text-green" : "text-red-500")}
              >
                {item.isBuy ? "+ " : "- "}
                {formatNumber(taoValue, 0)} τ
              </div>
              <div className="text-body-secondary text-xs">{formatUsd(usdValue)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const SubnetRightSidebar: FC<SubnetRightSidebarProps> = ({ netuid, className }) => {
  const [activeTab, setActiveTab] = useState<TabType>("signals")

  return (
    <div className={cn("flex flex-col gap-5 rounded-lg bg-grey-850 p-5", className)}>
      {/* Tab Selector */}
      <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content based on active tab */}
      {activeTab === "signals" && (
        <div className="flex flex-col gap-6 overflow-y-auto">
          <TrendingSentimentSection netuid={netuid} />
          <TradeFlowSection netuid={netuid} />
          <HoldersOverviewSection netuid={netuid} />
        </div>
      )}

      {activeTab === "social" && (
        <div className="flex-1 overflow-y-auto">
          <SocialFeedsSection netuid={netuid} />
        </div>
      )}

      {activeTab === "whale" && (
        <div className="flex-1 overflow-y-auto">
          <WhaleActivitySection netuid={netuid} />
        </div>
      )}
    </div>
  )
}
