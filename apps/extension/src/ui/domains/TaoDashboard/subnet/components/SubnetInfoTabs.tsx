import { cn } from "@talismn/util"
import { type FC, useState } from "react"

import {
  useSubnetDailyTrend,
  useSubnetPositions,
  useSubnetTokenomics,
  useSubnetTweets,
  useWhaleMovements,
} from "../../hooks/useSn45Api"

interface SubnetInfoTabsProps {
  netuid: number
  className?: string
}

type TabId = "sentiment" | "tokenomics" | "holders" | "whales"

const formatNumber = (num: number, decimals = 2) => {
  if (num === 0) return "—"
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

const SentimentTab: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: tweets, isLoading: tweetsLoading } = useSubnetTweets(netuid, 20)
  const { data: dailyTrend, isLoading: trendLoading } = useSubnetDailyTrend(netuid)

  const isLoading = tweetsLoading || trendLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-60 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  // Calculate sentiment summary from daily trend
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
    <div className="flex flex-col gap-8">
      {/* Sentiment Score */}
      <div className="rounded-lg bg-grey-800 p-8">
        <div className="mb-4 text-body-secondary text-xs">30-Day Sentiment Score</div>
        <div
          className={cn(
            "font-bold text-2xl",
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
        <div className="text-body-secondary text-xs">{sentimentSummary?.total ?? 0} analyses</div>
      </div>

      {/* Recent Tweets */}
      <div>
        <div className="mb-4 font-medium text-body-secondary text-xs">Recent X Posts</div>
        <div className="flex max-h-[300px] flex-col gap-4 overflow-y-auto">
          {tweets?.slice(0, 10).map((tweet) => (
            <a
              key={tweet.id}
              href={tweet.url || `https://twitter.com/i/status/${tweet.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-4 rounded-lg border border-grey-750 bg-grey-800 p-6 transition-colors hover:border-grey-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {tweet.author.profileImage ? (
                    <img
                      src={tweet.author.profileImage}
                      alt={tweet.author.name}
                      className="size-20 rounded-full"
                    />
                  ) : (
                    <div className="flex size-20 items-center justify-center rounded-full bg-grey-700 font-bold text-xs">
                      {tweet.author.screenName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="text-xs">@{tweet.author.screenName}</div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-6 py-2 font-medium text-[10px]",
                    getSentimentColor(tweet.sentiment)
                  )}
                >
                  {getSentimentLabel(tweet.sentiment)}
                </span>
              </div>
              <p className="line-clamp-2 text-body-secondary text-xs">{tweet.text}</p>
              <div className="flex items-center justify-between text-[10px] text-grey-600">
                <span>{formatTimeAgo(tweet.createdAt)}</span>
                <span className="opacity-0 transition-opacity group-hover:opacity-100">View →</span>
              </div>
            </a>
          ))}
          {(!tweets || tweets.length === 0) && (
            <div className="text-center text-body-secondary text-sm">
              No posts found for this subnet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TokenomicsTab: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: tokenomics, isLoading } = useSubnetTokenomics(netuid)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-40 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (!tokenomics) {
    return <div className="text-center text-body-secondary">No tokenomics data available</div>
  }

  const stats = [
    { label: "Price", value: `${parseFloat(tokenomics.movingPrice).toFixed(4)}τ` },
    { label: "Volume", value: formatNumber(parseFloat(tokenomics.volume) / 1e9, 0) },
    { label: "Alpha In", value: formatNumber(parseFloat(tokenomics.alphaIn) / 1e9, 0) },
    { label: "Alpha Out", value: formatNumber(parseFloat(tokenomics.alphaOut) / 1e9, 0) },
    { label: "EMA TAO Flow", value: formatNumber(parseFloat(tokenomics.emaTaoFlow) / 1e9, 0) },
  ]

  return (
    <div className="flex flex-col gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="flex justify-between rounded-lg bg-grey-800 px-8 py-6">
          <span className="text-body-secondary text-sm">{stat.label}</span>
          <span className="font-bold">{stat.value}</span>
        </div>
      ))}
    </div>
  )
}

const HoldersTab: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: positions, isLoading } = useSubnetPositions(netuid)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-32 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (!positions || positions.length === 0) {
    return <div className="text-center text-body-secondary">No holder data available</div>
  }

  // Top 10 holders
  const topHolders = positions.slice(0, 10)
  const totalAlpha = positions.reduce((sum, p) => sum + parseFloat(p.alphaBalance), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="font-medium text-body-secondary text-xs">Top 10 Holders</div>
      <div className="flex max-h-[250px] flex-col gap-2 overflow-y-auto">
        {topHolders.map((holder, i) => {
          const balance = parseFloat(holder.alphaBalance)
          const percentage = totalAlpha > 0 ? (balance / totalAlpha) * 100 : 0
          return (
            <div
              key={holder.coldkey}
              className="flex items-center justify-between rounded-lg bg-grey-800 px-8 py-6"
            >
              <div className="flex items-center gap-4">
                <span className="text-body-secondary text-xs">#{i + 1}</span>
                <span className="font-mono text-xs">{shortenAddress(holder.coldkey)}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-xs">{formatNumber(balance / 1e9, 0)}α</div>
                <div className="text-[10px] text-body-secondary">{percentage.toFixed(1)}%</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const WhalesTab: FC<{ netuid: number }> = ({ netuid }) => {
  const { data: whales, isLoading } = useWhaleMovements(50, 50)

  // Filter whales for this subnet
  const subnetWhales = whales?.filter((w) => w.netuid === netuid) ?? []

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={i} className="h-40 animate-pulse rounded-lg bg-grey-800" />
        ))}
      </div>
    )
  }

  if (subnetWhales.length === 0) {
    return (
      <div className="text-center text-body-secondary">No large transactions for this subnet</div>
    )
  }

  return (
    <div className="flex max-h-[350px] flex-col gap-2 overflow-y-auto">
      {subnetWhales.slice(0, 15).map((whale, i) => {
        const isAdding = whale.method === "Adding"
        return (
          <div
            key={`${whale.coldkey}-${whale.timestamp}-${i}`}
            className={cn(
              "flex flex-col gap-4 rounded-lg border p-6",
              isAdding ? "border-green/30 bg-green/5" : "border-red-500/30 bg-red-500/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex size-20 items-center justify-center rounded-full text-white",
                    isAdding ? "bg-green" : "bg-red-500"
                  )}
                >
                  {isAdding ? "↑" : "↓"}
                </div>
                <span className="font-mono text-xs">{whale.coldkeyShort}</span>
              </div>
              <span className={cn("font-bold", isAdding ? "text-green" : "text-red-500")}>
                {isAdding ? "+" : "-"}
                {whale.taoAmount.toFixed(1)}τ
              </span>
            </div>
            <div className="text-[10px] text-body-secondary">{formatTimeAgo(whale.timestamp)}</div>
          </div>
        )
      })}
    </div>
  )
}

export const SubnetInfoTabs: FC<SubnetInfoTabsProps> = ({ netuid, className }) => {
  const [activeTab, setActiveTab] = useState<TabId>("sentiment")

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "sentiment", label: "Sentiment" },
    { id: "tokenomics", label: "Tokenomics" },
    { id: "holders", label: "Holders" },
    { id: "whales", label: "Whales" },
  ]

  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-lg bg-grey-850", className)}>
      {/* Tab buttons */}
      <div className="flex shrink-0 border-grey-750 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 px-8 py-8 font-medium text-xs transition-colors",
              activeTab === tab.id
                ? "border-primary border-b-2 text-primary"
                : "text-body-secondary hover:text-body"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === "sentiment" && <SentimentTab netuid={netuid} />}
        {activeTab === "tokenomics" && <TokenomicsTab netuid={netuid} />}
        {activeTab === "holders" && <HoldersTab netuid={netuid} />}
        {activeTab === "whales" && <WhalesTab netuid={netuid} />}
      </div>
    </div>
  )
}
