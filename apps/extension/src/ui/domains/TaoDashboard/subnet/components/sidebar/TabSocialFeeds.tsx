import { cn } from "@talismn/util"
import { useSubnetDailyTrend, useSubnetTweets } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { formatTimeAgo } from "./shared"

export const TabSocialFeeds: FC<{ netuid: number }> = ({ netuid }) => (
  <SocialFeedsSection netuid={netuid} />
)

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
                <SentimentLabel sentiment={tweet.sentiment} />
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

// TODO check if used
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

const SentimentLabel: FC<{ sentiment: string }> = ({ sentiment }) => {
  const { t } = useTranslation()

  switch (sentiment) {
    case "very_bullish":
      return t("Very Bullish")
    case "bullish":
      return t("Bullish")
    case "neutral":
      return t("Neutral")
    case "bearish":
      return t("Bearish")
    case "very_bearish":
      return t("Very Bearish")
    default:
      return t("Unknown")
  }
}

// TODO check if used
// const getSentimentLabel = (score: number) => {
//   if (score >= 80) {
//     return "Very Bullish"
//   } else if (score >= 60) {
//     return "Bullish"
//   } else if (score >= 40) {
//     return "Neutral"
//   } else if (score >= 20) {
//     return "Bearish"
//   } else {
//     return "Very Bearish"
//   }
// }
