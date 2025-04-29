import { Route, Routes } from "react-router-dom"

import { NavigateWithQuery } from "@talisman/components/NavigateWithQuery"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { DashboardPortfolioHeader } from "@ui/domains/Portfolio/DashboardPortfolioHeader"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"
import { useFeatureFlag } from "@ui/state"

import { PortfolioAsset, PortfolioAssetHeader } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import { PortfolioNftCollection } from "./PortfolioNftCollection"
import { PortfolioNfts } from "./PortfolioNfts"
import { PortfolioLayout } from "./Shared/PortfolioLayout"

export const PortfolioRoutes = () => (
  <PortfolioContainer>
    <DashboardLayout sidebar="accounts">
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

const PortfolioToolbar = () => {
  const showNfts = useFeatureFlag("NFTS")

  return (
    <Routes>
      <Route path="tokens" element={<PortfolioToolbarTokens />} />
      <Route path="nfts" element={!!showNfts && <PortfolioToolbarNfts />} />
    </Routes>
  )
}

const PortfolioHeader = () => (
  <Routes>
    <Route path="tokens/:symbol" element={<PortfolioAssetHeader />} />
    <Route path="*" element={<DashboardPortfolioHeader />} />
  </Routes>
)
