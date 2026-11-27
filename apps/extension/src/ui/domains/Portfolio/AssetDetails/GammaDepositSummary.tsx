import { Tokens } from "@ui/domains/Asset/Tokens"
import { useTranslation } from "react-i18next"

import type { GammaDepositRow } from "./useTokenBalances"

export const GammaDepositSummary = ({
  deposit: { spendable, dailySpendCap, status },
  symbol,
  stacked,
}: {
  deposit: GammaDepositRow
  symbol: string
  stacked?: boolean
}) => {
  const { t } = useTranslation()

  const spendableText = (
    <span className="whitespace-nowrap">
      {t("Spendable")} <Tokens amount={spendable} symbol={symbol} isBalance noCountUp />
    </span>
  )
  const capText = (
    <span className="whitespace-nowrap">
      {status === "paused" ? (
        t("Paused")
      ) : dailySpendCap === null ? (
        t("No cap")
      ) : (
        <>
          {t("Daily cap")} <Tokens amount={dailySpendCap} symbol={symbol} isBalance noCountUp />
        </>
      )}
    </span>
  )

  if (stacked)
    return (
      <div className="flex flex-col items-end gap-2">
        {spendableText}
        {capText}
      </div>
    )

  return (
    <span>
      {spendableText} · {capText}
    </span>
  )
}
