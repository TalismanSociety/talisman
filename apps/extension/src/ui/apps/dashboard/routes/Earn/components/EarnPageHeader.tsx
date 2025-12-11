import { Balances } from "@talismn/balances"
import { cn } from "@talismn/util"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { useYieldxyzOpportunitiesByTokenId } from "@ui/domains/Earn/hooks/useYieldxyzOpportunitiesByTokenId"
import { useSelectedCurrency } from "@ui/state"

export const EarnPageHeader = () => {
  const { t } = useTranslation()
  const currency = useSelectedCurrency()

  // this hook already filters selected accounts
  const { status, data: tokenOpportunities } = useYieldxyzOpportunitiesByTokenId()

  const eligibleTotal = useMemo(() => {
    if (!tokenOpportunities) return null

    const allBalances = new Balances(tokenOpportunities?.flatMap((to) => to.balances.each) || [])
    return allBalances.sum.fiat(currency).transferable
  }, [currency, tokenOpportunities])

  return (
    <div className="text-body-secondary border-grey-800 flex justify-between rounded-[0.75rem] border text-left text-base">
      <div className="flex flex-col gap-4 px-6 py-8">
        <div className="text-body-secondary text-sm">{t("Yield-Eligible Capital")}</div>
        <div className="text-body text-2xl font-bold">
          {!eligibleTotal && status === "loading" ? (
            <div className="bg-grey-700 text-grey-700 animate-pulse rounded">$0.00</div>
          ) : (
            <Fiat amount={eligibleTotal} className={cn(status === "loading" && "animate-pulse")} />
          )}
        </div>
      </div>
    </div>
  )
}
