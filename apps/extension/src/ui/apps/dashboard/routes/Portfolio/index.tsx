import { useEffect } from "react"
import { Route, Routes, useSearchParams } from "react-router-dom"

import { NavigateWithQuery } from "@talisman/components/NavigateWithQuery"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/hooks/useBuyTokensModal"
import { DashboardPortfolioHeader } from "@ui/domains/Portfolio/DashboardPortfolioHeader"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"

import { PortfolioAsset, PortfolioAssetHeader } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import { PortfolioNftCollection } from "./PortfolioNftCollection"
import { PortfolioNfts } from "./PortfolioNfts"
import { PortfolioLayout } from "./Shared/PortfolioLayout"

const BuyTokensOpener = () => {
  const [searchParams, updateSearchParams] = useSearchParams()
  const { open: openBuyTokensModal } = useBuyTokensModal()

  useEffect(() => {
    const buyTokens = searchParams.get("buyTokens")
    if (buyTokens === null) return

    openBuyTokensModal()
    searchParams.delete("buyTokens")
    updateSearchParams(searchParams, { replace: true })
  }, [openBuyTokensModal, searchParams, updateSearchParams])

  return null
}

export const PortfolioRoutes = () => (
  <PortfolioContainer>
    <DashboardLayout sidebar="accounts">
      <BuyTokensOpener />

      {/* share layout to prevent tabs flickering */}
      <PortfolioLayout toolbar={<PortfolioToolbar />} header={<PortfolioHeader />}>
        <Routes>
          <Route path="tokens/:symbol" element={<PortfolioAsset />} />
          <Route path="nfts/:collectionId" element={<PortfolioNftCollection />} />
          <Route path="tokens" element={<PortfolioAssets />} />
          <Route path="nfts" element={<PortfolioNfts />} />
          <Route path="*" element={<NavigateWithQuery url="tokens" />} />
        </Routes>
      </PortfolioLayout>
    </DashboardLayout>
  </PortfolioContainer>
)

const PortfolioToolbar = () => (
  <Routes>
    <Route path="tokens" element={<PortfolioToolbarTokens />} />
    <Route path="nfts" element={<PortfolioToolbarNfts />} />
  </Routes>
)

const PortfolioHeader = () => (
  <Routes>
    <Route path="tokens/:symbol" element={<PortfolioAssetHeader />} />
    <Route path="*" element={<DashboardPortfolioHeader />} />
  </Routes>
)
