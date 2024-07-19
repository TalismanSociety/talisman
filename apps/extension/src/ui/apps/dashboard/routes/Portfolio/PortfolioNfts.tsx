import { useEffect } from "react"

import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioNfts = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio NFTs")
  }, [pageOpenEvent])

  return (
    <>
      <PortfolioToolbarTokens />
      <DashboardAssetsTable />
    </>
  )
}
