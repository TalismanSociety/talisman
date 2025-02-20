import { useEffect } from "react"

import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { GetStarted } from "@ui/domains/Portfolio/GetStarted/GetStarted"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { usePortfolio } from "@ui/state"

export const PortfolioAssets = () => {
  const { pageOpenEvent } = useAnalytics()
  const { search } = usePortfolio()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return (
    <>
      <DashboardAssetsTable />
      {!search && <GetStarted />}
    </>
  )
}
