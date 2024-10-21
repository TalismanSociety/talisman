import { useEffect } from "react"
import { Route, Routes, useSearchParams } from "react-router-dom"

import { NavigateWithQuery } from "@talisman/components/NavigateWithQuery"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"

import { DashboardLayout } from "../../layout"
import { PortfolioAsset } from "./PortfolioAsset"
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
  <DashboardLayout sidebar="accounts">
    <BuyTokensOpener />
    <PortfolioContainer>
      {/* share layout to prevent tabs flickering */}
      <PortfolioLayout toolbar={<PortfolioToolbar />}>
        <Routes>
          <Route path="tokens/:symbol" element={<PortfolioAsset />} />
          <Route path="nfts/:collectionId" element={<PortfolioNftCollection />} />
          <Route path="tokens" element={<PortfolioAssets />} />
          <Route path="nfts" element={<PortfolioNfts />} />
          <Route path="*" element={<NavigateWithQuery url="tokens" />} />
        </Routes>
      </PortfolioLayout>
    </PortfolioContainer>
  </DashboardLayout>
)

const PortfolioToolbar = () => (
  <Routes>
    <Route path="tokens" element={<PortfolioToolbarTokens />} />
    <Route path="nfts" element={<PortfolioToolbarNfts />} />
  </Routes>
)
