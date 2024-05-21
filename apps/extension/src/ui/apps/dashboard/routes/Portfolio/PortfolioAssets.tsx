import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { usePortfolioDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"

import { DashboardPortfolioLayout } from "../../layout/DashboardPortfolioLayout"
import { PortfolioStats } from "./PortfolioStats"

const FullscreenPortfolioAssets = () => {
  const { isInitializing } = usePortfolio()
  const balances = usePortfolioDisplayBalances()
  return <DashboardAssetsTable balances={balances} isInitializing={isInitializing} />
}

export const PortfolioAssets = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return (
    <DashboardPortfolioLayout>
      <PortfolioStats />
      <PortfolioTabs className="mb-6 mt-[3.8rem]" />
      <FullscreenPortfolioAssets />
    </DashboardPortfolioLayout>
  )
}
