import { Skeleton } from "@ui/components/Skeleton"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSwap } from "../SwapProvider"
import { formatSwapDuration } from "../swap-utils"

export const QuoteDuration = () => {
  const { t } = useTranslation()
  const { selectedQuote } = useSwap()

  const duration = useMemo(
    () => (selectedQuote ? formatSwapDuration(selectedQuote.timeInSec, t("Instant")) : undefined),
    [selectedQuote, t]
  )

  const isLoading = !selectedQuote

  return (
    <div className="flex h-11 w-full items-center justify-between gap-8">
      <div className="text-body-secondary text-xs">{t("Duration")}</div>
      <div className="text-xs">
        {isLoading ? (
          <Skeleton>Instant</Skeleton>
        ) : (
          <span className="text-body-secondary">{duration}</span>
        )}
      </div>
    </div>
  )
}
