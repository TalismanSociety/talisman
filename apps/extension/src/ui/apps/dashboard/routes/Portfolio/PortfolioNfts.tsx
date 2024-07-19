import { useEffect } from "react"

import { DashboardNfts } from "@ui/domains/Portfolio/Nfts/DashboardNfts"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioNfts = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio NFTs")
  }, [pageOpenEvent])

  return (
    <>
      <PortfolioToolbarNfts />
      <DashboardNfts />
    </>
  )
}
