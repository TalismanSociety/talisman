import { useEffect } from "react"
import { useMatch } from "react-router-dom"

import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { DashboardNfts } from "@ui/domains/Portfolio/Nfts/DashboardNfts"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioHome = () => {
  const { pageOpenEvent } = useAnalytics()

  // can't use the Routes component here because we're already in the component that matches the location
  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")

  useEffect(() => {
    if (matchTokens) pageOpenEvent("portfolio assets")
    if (matchNfts) pageOpenEvent("portfolio nfts")
  }, [matchNfts, matchTokens, pageOpenEvent])

  return (
    <>
      {!!matchTokens && (
        <>
          <PortfolioToolbarTokens />
          <DashboardAssetsTable />
        </>
      )}
      {!!matchNfts && (
        <>
          <PortfolioToolbarNfts />
          <DashboardNfts />
        </>
      )}
    </>
  )
}
