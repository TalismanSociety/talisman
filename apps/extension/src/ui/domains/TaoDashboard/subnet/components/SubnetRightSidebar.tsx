import { Icon } from "@iconify/react"
import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import { cn } from "@talismn/util"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { type FC, useMemo } from "react"
import {
  useSubnetDailyTrend,
  useSubnetPositions,
  useSubnetStakeEvents,
  useSubnetTokenomics,
  useSubnetTweets,
} from "../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"

interface SubnetRightSidebarProps {
  netuid: number
  className?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

const formatNumber = (num: number, decimals = 0): string => {
  if (num === 0) return "0"
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(decimals)
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

const shortenAddress = (address: string) => {
  if (!address) return "—"
  return `${address.slice(0, 6)}...${address.slice(-4)}`
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

const getSentimentLabel = (sentiment: string) => {
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
      return sentiment
  }
}

// ============================================================================
// Flow Summary Section (Alpha & TAO Flow)
// ============================================================================

const FlowSummarySection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)

  const isLoading = stakeLoading || tokenomicsLoading

  const flowTotals = useMemo(() => {
    if (!stakeEvents || stakeEvents.length === 0) {
      return { alphaIn: 0, alphaOut: 0, taoIn: 0, taoOut: 0 }
    }

    let alphaIn = 0
    let alphaOut = 0
    let taoIn = 0
    let taoOut = 0

    for (const event of stakeEvents) {
      const alpha = parseFloat(event.alphaAmount) / 1e9
      const tao = parseFloat(event.taoAmount) / 1e9

      if (event.method === "Adding") {
        alphaIn += alpha
        taoIn += tao
      } else {
        alphaOut += alpha
        taoOut += tao
      }
    }

    return { alphaIn, alphaOut, taoIn, taoOut }
  }, [stakeEvents])

  const totals = useMemo(() => {
    if (tokenomics) {
      return {
        alphaIn: parseFloat(tokenomics.alphaIn) / 1e9,
        alphaOut: parseFloat(tokenomics.alphaOut) / 1e9,
        taoIn: flowTotals.taoIn,
        taoOut: flowTotals.taoOut,
      }
    }
    return flowTotals
  }, [tokenomics, flowTotals])

  const alphaNet = totals.alphaIn - totals.alphaOut
  const taoNet = totals.taoIn - totals.taoOut

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 animate-pulse rounded-lg bg-grey-800" />
        <div className="h-32 animate-pulse rounded-lg bg-grey-800" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Alpha Flow Card */}
      <div className="rounded-lg border border-grey-750 bg-grey-900/50 p-4">
        <div className="mb-3 flex items-center gap-2 font-medium text-body-secondary text-xs uppercase tracking-wider">
          <Icon icon="mdi:alpha-a-circle" className="size-4 text-primary" />
          Alpha Flow
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-secondary">In</span>
            <span className="font-medium text-[#26a69a]">{formatNumber(totals.alphaIn)}α</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-secondary">Out</span>
            <span className="font-medium text-[#ef5350]">{formatNumber(totals.alphaOut)}α</span>
          </div>
          <div className="border-grey-750 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-body-secondary text-xs">Net</span>
              <span
                className={cn(
                  "font-bold text-base",
                  alphaNet >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
                )}
              >
                {alphaNet >= 0 ? "+" : ""}
                {formatNumber(alphaNet)}α
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TAO Flow Card */}
      <div className="rounded-lg border border-grey-750 bg-grey-900/50 p-4">
        <div className="mb-3 flex items-center gap-2 font-medium text-body-secondary text-xs uppercase tracking-wider">
          <Icon icon="mdi:tau" className="size-4 text-primary" />
          TAO Flow
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-secondary">In</span>
            <span className="font-medium text-[#26a69a]">{formatNumber(totals.taoIn, 1)}τ</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-body-secondary">Out</span>
            <span className="font-medium text-[#ef5350]">{formatNumber(totals.taoOut, 1)}τ</span>
          </div>
          <div className="border-grey-750 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-body-secondary text-xs">Net</span>
              <span
                className={cn(
                  "font-bold text-base",
                  taoNet >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"
                )}
              >
                {taoNet >= 0 ? "+" : ""}
                {formatNumber(taoNet, 1)}τ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Trading Signals Section
// ============================================================================

interface TradingMetrics {
  buySellRatio24h: number
  uniqueTraders24h: number
  avgTradeSize: number
  tradesPerHour: number
  whaleConcentration: number
  totalHolders: number
  flowMomentum: "accumulating" | "distributing" | "neutral"
}

function computeTradingMetrics(
  stakeEvents: Array<{
    method: "Adding" | "Removing"
    taoAmount: string
    coldkey?: string
    timestamp: string
  }> | null,
  positions: Array<{ alphaBalance: string; coldkey: string }> | null,
  tokenomics: { emaTaoFlow: string } | null
): TradingMetrics {
  const now = Date.now()
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

  const recent24h = (stakeEvents ?? []).filter(
    (e) => new Date(e.timestamp).getTime() > twentyFourHoursAgo
  )

  const buys24h = recent24h.filter((e) => e.method === "Adding")
  const sells24h = recent24h.filter((e) => e.method === "Removing")

  const buyVolume = buys24h.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)
  const sellVolume = sells24h.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)

  const buySellRatio24h = sellVolume > 0 ? buyVolume / sellVolume : buyVolume > 0 ? 999 : 1

  const uniqueTraders24h = new Set(recent24h.map((e) => e.coldkey).filter(Boolean)).size

  const totalTaoVolume = (stakeEvents ?? []).reduce(
    (sum, e) => sum + parseFloat(e.taoAmount) / 1e9,
    0
  )
  const avgTradeSize =
    stakeEvents && stakeEvents.length > 0 ? totalTaoVolume / stakeEvents.length : 0

  const tradesPerHour = recent24h.length / 24

  const validPositions = (positions ?? []).filter((p) => parseFloat(p.alphaBalance) > 0)
  const totalAlpha = validPositions.reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
  const top10Alpha = validPositions
    .slice(0, 10)
    .reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)
  const whaleConcentration = totalAlpha > 0 ? (top10Alpha / totalAlpha) * 100 : 0
  const totalHolders = validPositions.length

  let flowMomentum: "accumulating" | "distributing" | "neutral" = "neutral"
  if (tokenomics?.emaTaoFlow) {
    const flowMomentumValue = parseFloat(tokenomics.emaTaoFlow) / 1e9
    if (flowMomentumValue > 1000) {
      flowMomentum = "accumulating"
    } else if (flowMomentumValue < -1000) {
      flowMomentum = "distributing"
    }
  }

  return {
    buySellRatio24h,
    uniqueTraders24h,
    avgTradeSize,
    tradesPerHour,
    whaleConcentration,
    totalHolders,
    flowMomentum,
  }
}

const TradingSignalsSection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: positions, isLoading: positionsLoading } = useSubnetPositions(netuid)
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)

  const isLoading = stakeLoading || positionsLoading || tokenomicsLoading

  const metrics = useMemo(() => {
    return computeTradingMetrics(stakeEvents ?? null, positions ?? null, tokenomics ?? null)
  }, [stakeEvents, positions, tokenomics])

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loaders
          <div key={i} className="h-20 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  const signals = [
    {
      icon: "mdi:chart-line",
      label: "Buy/Sell",
      value: metrics.buySellRatio24h >= 100 ? "∞" : metrics.buySellRatio24h.toFixed(2),
      color:
        metrics.buySellRatio24h >= 1.2
          ? "text-green"
          : metrics.buySellRatio24h <= 0.8
            ? "text-red-500"
            : "text-body-secondary",
      subtitle:
        metrics.buySellRatio24h >= 1.2
          ? "Bullish"
          : metrics.buySellRatio24h <= 0.8
            ? "Bearish"
            : "Balanced",
    },
    {
      icon: "mdi:account-group",
      label: "Traders",
      value: metrics.uniqueTraders24h.toString(),
      color: "text-[#2563eb]",
      subtitle: "24h active",
    },
    {
      icon: "mdi:flash",
      label: "Avg Trade",
      value: `${metrics.avgTradeSize.toFixed(1)}τ`,
      color: "text-[#7c3aed]",
      subtitle: metrics.avgTradeSize >= 10 ? "Whale" : "Retail",
    },
    {
      icon: "mdi:speedometer",
      label: "Velocity",
      value: metrics.tradesPerHour.toFixed(1),
      color: "text-[#ea580c]",
      subtitle: "Trades/hr",
    },
    {
      icon: "mdi:chart-pie",
      label: "Top 10",
      value: `${metrics.whaleConcentration.toFixed(0)}%`,
      color:
        metrics.whaleConcentration >= 80
          ? "text-red-500"
          : metrics.whaleConcentration >= 60
            ? "text-[#ea580c]"
            : "text-green",
      subtitle: `${metrics.totalHolders} holders`,
    },
    {
      icon: "mdi:trending-up",
      label: "Flow",
      value:
        metrics.flowMomentum === "accumulating"
          ? "↗"
          : metrics.flowMomentum === "distributing"
            ? "↘"
            : "→",
      color:
        metrics.flowMomentum === "accumulating"
          ? "text-green"
          : metrics.flowMomentum === "distributing"
            ? "text-red-500"
            : "text-body-secondary",
      subtitle:
        metrics.flowMomentum === "accumulating"
          ? "Accum"
          : metrics.flowMomentum === "distributing"
            ? "Distrib"
            : "Neutral",
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {signals.map((signal) => (
        <div
          key={signal.label}
          className="flex flex-col items-center rounded-lg border border-grey-750 bg-grey-900/50 p-3 text-center transition-colors hover:border-grey-600"
        >
          <Icon icon={signal.icon} className="mb-1.5 size-5 text-body-secondary" />
          <div className={cn("font-bold text-base leading-tight", signal.color)}>
            {signal.value}
          </div>
          <div className="text-body-secondary text-xs">{signal.subtitle}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Stats Section (Tokenomics as widgets)
// ============================================================================

const StatsSection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)
  const { subnetData, isLoading: subnetLoading } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const isLoading = tokenomicsLoading || subnetLoading

  const subnetInfo = useMemo(() => {
    return subnetData?.find((s) => s.netuid === netuid)
  }, [subnetData, netuid])

  const emissionDisplay = useMemo(() => {
    if (!subnetInfo?.emission) return "N/A"
    return `${(Number(BigInt(subnetInfo.emission) * 200n) / Number(ALPHA_PRICE_SCALE)).toFixed(2)}%`
  }, [subnetInfo?.emission])

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loaders
          <div key={i} className="h-20 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (!tokenomics) {
    return <div className="py-3 text-center text-body-secondary text-sm">No data available</div>
  }

  const stats = [
    {
      icon: "mdi:currency-usd",
      label: "Price",
      value: `${parseFloat(tokenomics.movingPrice).toFixed(4)}τ`,
      color: "text-primary",
    },
    {
      icon: "mdi:chart-bar",
      label: "Volume",
      value: formatNumber(parseFloat(tokenomics.volume) / 1e9, 0),
      color: "text-[#2563eb]",
    },
    {
      icon: "mdi:fire",
      label: "Emissions",
      value: emissionDisplay,
      color: "text-[#f59e0b]",
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center rounded-lg border border-grey-750 bg-grey-900/50 p-3 text-center transition-colors hover:border-grey-600"
        >
          <Icon icon={stat.icon} className="mb-1.5 size-5 text-body-secondary" />
          <div className={cn("font-bold text-base leading-tight", stat.color)}>{stat.value}</div>
          <div className="text-body-secondary text-xs">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Holders Section
// ============================================================================

const _HoldersSection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: positions, isLoading } = useSubnetPositions(netuid)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loaders
          <div key={i} className="h-11 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (!positions || positions.length === 0) {
    return <div className="py-3 text-center text-body-secondary text-sm">No holder data</div>
  }

  const topHolders = positions.slice(0, 5)
  const totalAlpha = positions.reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)

  return (
    <div className="flex flex-col gap-2">
      {topHolders.map((holder, i) => {
        const balance = parseFloat(holder.alphaBalance)
        const percentage = totalAlpha > 0 ? (balance / totalAlpha) * 100 : 0
        return (
          <div
            key={holder.coldkey}
            className="flex items-center justify-between rounded-lg bg-grey-800/50 px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-body-secondary text-xs">#{i + 1}</span>
              <span className="font-mono text-xs">{shortenAddress(holder.coldkey)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-medium text-xs">{formatNumber(balance / 1e9, 0)}α</span>
              <span className="w-12 text-right text-body-secondary text-xs">
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}
      <div className="mt-2 text-center text-body-secondary text-xs">
        {positions.length} total holders
      </div>
    </div>
  )
}

// ============================================================================
// X Sentiment Feed Section
// ============================================================================

const SentimentFeedSection: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: tweets, isLoading: tweetsLoading } = useSubnetTweets(netuid, 20)
  const { data: dailyTrend, isLoading: trendLoading } = useSubnetDailyTrend(netuid)

  const isLoading = tweetsLoading || trendLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-12 animate-pulse rounded-lg bg-grey-800" />
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loaders
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
                {getSentimentLabel(tweet.sentiment)}
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
// Main Component
// ============================================================================

export const SubnetRightSidebar: FC<SubnetRightSidebarProps> = ({ netuid, className }) => {
  return (
    <div className={cn("flex flex-col rounded-lg bg-grey-850", className)}>
      {/* Header */}
      <div className="shrink-0 border-grey-750 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:chart-timeline-variant" className="size-5 text-primary" />
          <span className="font-medium text-base">Analytics</span>
        </div>
      </div>

      {/* Stats Section - Always visible at top */}
      <div className="shrink-0 border-grey-750 border-b p-5">
        <StatsSection netuid={netuid} />
      </div>

      {/* Scrollable Content */}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        {/* Flow Summary */}
        <div>
          <div className="mb-3 font-medium text-body-secondary text-xs uppercase tracking-wider">
            Token Flow
          </div>
          <FlowSummarySection netuid={netuid} />
        </div>

        {/* Trading Signals */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="font-medium text-body-secondary text-xs uppercase tracking-wider">
              Trading Signals
            </span>
            <span className="rounded bg-grey-700 px-2 py-1 text-[10px] text-body-secondary">
              24h
            </span>
          </div>
          <TradingSignalsSection netuid={netuid} />
        </div>

        {/* Divider */}
        {/* <hr className="border-grey-750" /> */}

        {/* Holders Section */}
        {/* <div>
          <div className="mb-3 flex items-center gap-2">
            <Icon icon="mdi:account-multiple" className="size-4 text-body-secondary" />
            <span className="text-xs font-medium uppercase tracking-wider text-body-secondary">
              Top Holders
            </span>
          </div>
          <HoldersSection netuid={netuid} />
        </div> */}

        {/* Divider */}
        <hr className="border-grey-750" />

        {/* X Sentiment Feed Section */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Icon icon="mdi:twitter" className="size-4 text-[#1DA1F2]" />
            <span className="font-medium text-body-secondary text-xs uppercase tracking-wider">
              X Sentiment Feed
            </span>
          </div>
          <SentimentFeedSection netuid={netuid} />
        </div>
      </div>
    </div>
  )
}
