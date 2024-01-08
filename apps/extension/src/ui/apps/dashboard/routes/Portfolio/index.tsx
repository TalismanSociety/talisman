import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { StakingBannerProvider } from "@ui/domains/Staking/context"
import { useEffect } from "react"
import { Route, Routes, useSearchParams } from "react-router-dom"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

export const PortfolioRoutes = () => {
  // popup may pass an account in the query string, with expand button
  const { select } = useSelectedAccount()
  const [searchParams, updateSearchParams] = useSearchParams()

  useEffect(() => {
    const account = searchParams.get("account")
    if (account) {
      select(account === "all" ? undefined : account)
      searchParams.delete("account")
      updateSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, select, updateSearchParams])

  return (
    // share layout to prevent sidebar flickering when navigating between the 2 pages
    <DashboardLayout centered large>
      <PortfolioProvider>
        <StakingBannerProvider>
          <Routes>
            {/* To match popup structure, in case of expand */}
            <Route path="/assets" element={<PortfolioAssets />} />
            <Route path=":symbol" element={<PortfolioAsset />} />
            <Route path="" element={<PortfolioAssets />} />
          </Routes>
        </StakingBannerProvider>
      </PortfolioProvider>
    </DashboardLayout>
  )
}
