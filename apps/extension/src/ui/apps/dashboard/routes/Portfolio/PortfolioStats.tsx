import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

export const PortfolioStats = () => {
  const { networkBalances } = usePortfolio()
  const balances = useDisplayBalances(networkBalances)
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const {
    total: portfolio,
    transferable: available,
    unavailable: locked,
  } = useMemo(() => balances.sum.fiat(currency), [balances.sum, currency])

  return (
    <div className="flex w-full gap-8">
      <Statistics
        className="max-w-[40%]"
        title={t("Total Portfolio Value")}
        fiat={portfolio}
        showCurrencyToggle
      />
      <Statistics className="max-w-[40%]" title={t("Locked")} fiat={locked} locked />
      <Statistics className="max-w-[40%]" title={t("Available")} fiat={available} />
    </div>
  )
}
