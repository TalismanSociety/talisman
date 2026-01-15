import { Sn45Api } from "extension-core"
import type { ToolHandler, ToolHandlerResult } from "../../types"

// Use local dev URL in development, otherwise use production
const SN45_API_BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:8787" : "https://sn45api.talisman.xyz"

const sn45Api = new Sn45Api({ baseUrl: SN45_API_BASE_URL })

interface GetSubnetSentimentInput {
  netuid: number
  include_tweets?: boolean
}

export const getSubnetSentiment: ToolHandler<GetSubnetSentimentInput> = async (
  input
): Promise<ToolHandlerResult> => {
  try {
    const { netuid, include_tweets = false } = input

    if (!netuid || typeof netuid !== "number") {
      return {
        success: false,
        error: "Invalid or missing subnet ID (netuid). Please provide a valid subnet number.",
      }
    }

    // Fetch sentiment data for the subnet
    const [sentimentListResponse, dailyTrendResponse, tweetsResponse] = await Promise.all([
      sn45Api.v1.getSubnetSentimentList(),
      sn45Api.v1.getSubnetDailyTrend(String(netuid)),
      include_tweets ? sn45Api.v1.getSubnetTweets(String(netuid), { limit: "10" }) : null,
    ])

    const sentimentList = sentimentListResponse.data
    const dailyTrend = dailyTrendResponse.data
    const tweets = tweetsResponse?.data

    // Find sentiment for this specific subnet
    const subnetSentiment = sentimentList?.find((s) => s.subnetId === netuid)

    if (!subnetSentiment) {
      return {
        success: false,
        error: `No sentiment data available for subnet ${netuid}. This subnet may not have enough social activity to analyze.`,
      }
    }

    // Calculate sentiment label
    const getSentimentLabel = (score: number): string => {
      if (score >= 0.6) return "Very Bullish"
      if (score >= 0.2) return "Bullish"
      if (score >= -0.2) return "Neutral"
      if (score >= -0.6) return "Bearish"
      return "Very Bearish"
    }

    // Analyze trend direction from daily data
    const analyzeTrend = () => {
      if (!dailyTrend || dailyTrend.length < 2) return "Insufficient data for trend analysis"

      const recent = dailyTrend.slice(-7) // Last 7 days
      if (recent.length < 2) return "Insufficient data for trend analysis"

      const firstHalf = recent.slice(0, Math.floor(recent.length / 2))
      const secondHalf = recent.slice(Math.floor(recent.length / 2))

      const avgFirst = firstHalf.reduce((sum, d) => sum + d.sentimentScore, 0) / firstHalf.length
      const avgSecond = secondHalf.reduce((sum, d) => sum + d.sentimentScore, 0) / secondHalf.length

      const diff = avgSecond - avgFirst
      if (diff > 0.1) return "Improving"
      if (diff < -0.1) return "Declining"
      return "Stable"
    }

    // Format tweet data if included
    const formatTweets = () => {
      if (!tweets || tweets.length === 0) return undefined

      return tweets.slice(0, 5).map((tweet) => ({
        author: tweet.author.screenName,
        text: tweet.text.slice(0, 200) + (tweet.text.length > 200 ? "..." : ""),
        sentiment: tweet.sentiment,
        engagement: tweet.likeCount + tweet.retweetCount + tweet.replyCount,
        url: tweet.url,
      }))
    }

    return {
      success: true,
      data: {
        netuid,
        summary: {
          sentimentScore: subnetSentiment.sentimentScore.toFixed(2),
          sentimentLabel: getSentimentLabel(subnetSentiment.sentimentScore),
          totalMentions: subnetSentiment.total,
          breakdown: {
            veryBullish: subnetSentiment.veryBullish,
            bullish: subnetSentiment.bullish,
            neutral: subnetSentiment.neutral,
            bearish: subnetSentiment.bearish,
            veryBearish: subnetSentiment.veryBearish,
          },
        },
        trend: {
          direction: analyzeTrend(),
          recentDays: dailyTrend?.slice(-7).map((d) => ({
            date: d.date,
            score: d.sentimentScore.toFixed(2),
            mentions: d.total,
          })),
        },
        ...(include_tweets && { recentTweets: formatTweets() }),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch sentiment data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
