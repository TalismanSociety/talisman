import { Tokens } from "@ui/domains/Asset/Tokens"
import type { ReactNode } from "react"
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
        <span className="text-alert-warn">{t("Paused")}</span>
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
    <DotSeparatedWrap>
      {spendableText}
      {capText}
    </DotSeparatedWrap>
  )
}

const DotSeparatedWrap = ({ children }: { children: ReactNode }) => (
  <div className="overflow-hidden">
    <div className="-ml-6 flex flex-wrap *:before:inline-block *:before:w-6 *:before:text-center *:before:content-['·']">
      {children}
    </div>
  </div>
)
