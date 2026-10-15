import { useMemo } from "react"
import { useTranslation } from "react-i18next"

type Sentiment = "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish"

const useSentimentLabel = (sentiment: Sentiment | null) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (!sentiment) return t("N/A")

    switch (sentiment) {
      case "very_bearish":
        return t("Very Bearish")
      case "bearish":
        return t("Bearish")
      case "neutral":
        return t("Neutral")
      case "bullish":
        return t("Bullish")
      case "very_bullish":
        return t("Very Bullish")
      default:
        return t("Unknown")
    }
  }, [sentiment, t])
}

const useSentimentFromScore100Pos = (score: number | null): Sentiment | null => {
  return useMemo(() => {
    if (score === null) return null
    if (score < 20) return "very_bearish"
    if (score < 40) return "bearish"
    if (score < 60) return "neutral"
    if (score < 80) return "bullish"
    return "very_bullish"
  }, [score])
}

export const useSentimentLabelFromScore100Pos = (score: number | null) => {
  const sentiment = useSentimentFromScore100Pos(score)
  return useSentimentLabel(sentiment)
}
