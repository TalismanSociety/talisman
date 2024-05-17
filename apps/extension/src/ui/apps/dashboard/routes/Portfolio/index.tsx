import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { useEffect } from "react"
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

export const PortfolioRoutes = () => {
  const [searchParams, updateSearchParams] = useSearchParams()
  const { open: openBuyTokensModal } = useBuyTokensModal()

  useEffect(() => {
    const buyTokens = searchParams.get("buyTokens")
    if (buyTokens === null) return

    openBuyTokensModal()
    searchParams.delete("buyTokens")
    updateSearchParams(searchParams, { replace: true })
  }, [openBuyTokensModal, searchParams, updateSearchParams])

  return (
    // share layout to prevent sidebar flickering when navigating between the 2 pages
    <DashboardLayout centered large className="min-w-[auto]">
      <PortfolioContainer>
        <Routes>
          {/* To match popup structure, in case of expand */}
          <Route path="tokens/:symbol" element={<PortfolioAsset />} />
          <Route path="/" element={<Navigate to="tokens" />} />
          <Route path="*" element={<PortfolioAssets />} />
        </Routes>
      </PortfolioContainer>
    </DashboardLayout>
  )
}
