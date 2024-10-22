import { useEffect } from "react"
import { createPortal } from "react-dom"

import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioAssets = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  const container = document.getElementById("portfolio-toolbar")

  return (
    <>
      {!!container && createPortal(<PortfolioToolbarTokens />, container)}
      <DashboardAssetsTable />
    </>
  )
}
