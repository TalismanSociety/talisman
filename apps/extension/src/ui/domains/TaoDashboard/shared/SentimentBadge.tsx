import { cn } from "@talismn/util"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

type Sentiment = "very_bearish" | "bearish" | "neutral" | "bullish" | "very_bullish"

export const SentimentBadge: FC<{ sentiment: Sentiment }> = ({ sentiment }) => {
  const label = useSentimentLabel(sentiment)

  const className = useMemo(() => {
    switch (sentiment) {
      case "very_bearish":
      case "bearish":
        return "bg-sell/10 text-sell"

      case "very_bullish":
      case "bullish":
        return "bg-buy/10 text-buy"

      // case "neutral":
      default:
        return "bg-body-secondary/10 text-body-secondary"
    }
  }, [sentiment])

  return (
    <div
      className={cn(
        "inline-flex h-12 items-center rounded-full px-5 text-center text-xs",
        className
      )}
    >
      {label}
    </div>
  )
}

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
