import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import { NomPoolStakingBannerProvider } from "@ui/domains/Portfolio/NomPoolStakingContext"
import Site from "@ui/domains/Site"
import { PendingTransactionsButton } from "@ui/domains/Transactions"
import { Suspense, lazy } from "react"
import { Route, Routes } from "react-router-dom"

import Layout, { Content, Header } from "../../Layout"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

const BraveWarningPopupBanner = lazy(
  () => import("@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner")
)
const AnalyticsAlert = lazy(() => import("@ui/domains/Settings/Analytics/AnalyticsAlert"))
const MigratePasswordAlert = lazy(() => import("@ui/domains/Settings/MigratePasswordAlert"))

const TopRight = () => {
  return (
    <Routes>
      <Route path="" element={<PendingTransactionsButton />} />
      <Route
        path="*"
        element={
          <div className="text-xl">
            <CurrentAccountAvatar withTooltip />
          </div>
        }
      />
    </Routes>
  )
}

export const Portfolio = () => {
  return (
    <PortfolioProvider>
      <NomPoolStakingBannerProvider>
        {/* share layout to prevent sidebar flickering when navigating between the 2 pages */}
        <Layout withBottomNav>
          <Header text={<Site.ConnectedAccountsPill />} nav={<TopRight />} />
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
              <MigratePasswordAlert />
            </Suspense>
            <Suspense fallback={null}>
              <AnalyticsAlert />
            </Suspense>
          </Content>
        </Layout>
      </NomPoolStakingBannerProvider>
    </PortfolioProvider>
  )
}
