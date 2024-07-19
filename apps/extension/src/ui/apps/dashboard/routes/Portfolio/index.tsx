import { useEffect } from "react"
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom"

import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { DashboardPortfolioLayout } from "../../layout/DashboardPortfolioLayout"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import { PortfolioNftCollection } from "./PortfolioNftCollection"
import { PortfolioNfts } from "./PortfolioNfts"

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
    // share layout to prevent sidebar flickering when navigating between pages
    <DashboardLayout centered large className="min-w-[auto]">
      <PortfolioContainer>
        {/* share layout to prevent tabs flickering */}
        <DashboardPortfolioLayout>
          <Routes>
            <Route path="tokens/:symbol" element={<PortfolioAsset />} />
            <Route path="nfts/:collectionId" element={<PortfolioNftCollection />} />
            <Route path="tokens" element={<PortfolioAssets />} />
            <Route path="nfts" element={<PortfolioNfts />} />
            <Route path="*" element={<Navigate to="tokens" />} />
          </Routes>
        </DashboardPortfolioLayout>
      </PortfolioContainer>
    </DashboardLayout>
  )
}
