import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import Site from "@ui/domains/Site"
import { Suspense, lazy } from "react"
import { Route, Routes } from "react-router-dom"
import { BottomNav } from "../../components/Navigation/BottomNav"

import Layout, { Content, Header } from "../../Layout"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

const BraveWarningPopupBanner = lazy(
  () => import("@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner")
)
const AnalyticsAlert = lazy(() => import("@ui/domains/Settings/Analytics/AnalyticsAlert"))

export const Portfolio = () => {
  return (
    <PortfolioProvider>
      {/* share layout to prevent sidebar flickering when navigating between the 2 pages */}
      <Layout withBottomNav>
        <Header text={<Site.ConnectedAccountsPill />} />
        <Content>
          <Routes>
            <Route path="assets" element={<PortfolioAssets />} />
            <Route path=":symbol" element={<PortfolioAsset />} />
            <Route path="" element={<PortfolioAccounts />} />
          </Routes>
          <Suspense fallback={null}>
            <BraveWarningPopupBanner />
          </Suspense>
          <Suspense fallback={null}>
            <AnalyticsAlert />
          </Suspense>
        </Content>
      </Layout>
    </PortfolioProvider>
  )
}
