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

export const useSentimentLabel = (sentiment: Sentiment) => {
  const { t } = useTranslation()

  return useMemo(() => {
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
