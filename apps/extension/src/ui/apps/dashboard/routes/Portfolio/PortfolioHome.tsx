import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { DashboardNfts } from "@ui/domains/Portfolio/AssetsTable/DashboardNfts"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { PortfolioToolbar } from "@ui/domains/Portfolio/PortfolioToolbar"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { usePortfolioDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { Suspense, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useMatch } from "react-router-dom"

import { DashboardPortfolioLayout } from "../../layout/DashboardPortfolioLayout"

const PortfolioStats = () => {
  const balances = usePortfolioDisplayBalances("network")
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

export const PortfolioHome = () => {
  const { pageOpenEvent } = useAnalytics()
  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return (
    <DashboardPortfolioLayout>
      <PortfolioStats />
      <PortfolioTabs className="text-md mb-6 mt-[3.8rem] h-14 font-bold" />
      <PortfolioToolbar />
      {/* can't use the Routes component here because we're already in the component that matches the location */}
      <Suspense fallback={<SuspenseTracker name="PortfolioHome content" />}>
        {!!matchTokens && <DashboardAssetsTable />}
        {!!matchNfts && <DashboardNfts />}
      </Suspense>
    </DashboardPortfolioLayout>
  )
}
