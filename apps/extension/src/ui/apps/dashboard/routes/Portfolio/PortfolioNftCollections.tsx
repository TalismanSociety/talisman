import { DashboardNfts } from "@ui/domains/Portfolio/AssetsTable/DashboardNfts"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"

import { PortfolioStats } from "./PortfolioStats"

export const PortfolioNftCollections = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return (
    <div className="flex w-full flex-col">
      <PortfolioStats />
      <PortfolioTabs className="mb-6 mt-[3.8rem]" />
      <DashboardNfts />
    </div>
  )
}
