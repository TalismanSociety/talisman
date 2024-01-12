import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useEffect } from "react"
import { Route, Routes, useSearchParams } from "react-router-dom"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

export const PortfolioRoutes = () => {
  // popup may pass an account in the query string, with expand button
  const { select } = useSelectedAccount()
  const [searchParams, updateSearchParams] = useSearchParams()
  const { open: openBuyTokensModal } = useBuyTokensModal()

  useEffect(() => {
    const account = searchParams.get("account")
    if (!account) return

    select(account === "all" ? undefined : account)
    searchParams.delete("account")
    updateSearchParams(searchParams, { replace: true })
  }, [searchParams, select, updateSearchParams])

  useEffect(() => {
    const buyTokens = searchParams.get("buyTokens")
    if (buyTokens === null) return

    openBuyTokensModal()
    searchParams.delete("buyTokens")
    updateSearchParams(searchParams, { replace: true })
  }, [openBuyTokensModal, searchParams, updateSearchParams])

  return (
    // share layout to prevent sidebar flickering when navigating between the 2 pages
    <DashboardLayout centered large>
      <Routes>
        {/* To match popup structure, in case of expand */}
        <Route path="/assets" element={<PortfolioAssets />} />
        <Route path=":symbol" element={<PortfolioAsset />} />
        <Route path="" element={<PortfolioAssets />} />
      </Routes>
    </DashboardLayout>
  )
}
