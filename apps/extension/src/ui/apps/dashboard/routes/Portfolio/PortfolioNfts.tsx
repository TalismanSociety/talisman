import { useEffect } from "react"
import { createPortal } from "react-dom"

import { DashboardNfts } from "@ui/domains/Portfolio/Nfts/DashboardNfts"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioNfts = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio NFTs")
  }, [pageOpenEvent])

  const container = document.getElementById("portfolio-toolbar")

  return (
    <>
      {!!container && createPortal(<PortfolioToolbarNfts />, container)}
      <DashboardNfts />
    </>
  )
}
