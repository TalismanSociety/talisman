import { useEffect } from "react"

import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioAssets = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return <DashboardAssetsTable />
}
