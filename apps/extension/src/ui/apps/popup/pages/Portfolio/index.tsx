import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import { NomPoolStakingBannerProvider } from "@ui/domains/Portfolio/NomPoolStakingContext"
import Site from "@ui/domains/Site"
import { Suspense, lazy } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import Layout, { Content, Header } from "../../Layout"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

const BraveWarningPopupBanner = lazy(
  () => import("@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner")
)
const AnalyticsAlert = lazy(() => import("@ui/domains/Settings/Analytics/AnalyticsAlert"))
const MigratePasswordAlert = lazy(() => import("@ui/domains/Settings/MigratePasswordAlert"))

const AccountAvatar = () => {
  const location = useLocation()

  // do now show it on portfolio's home
  if (location.pathname === "/portfolio") return null

  return (
    <div className="text-xl">
      <CurrentAccountAvatar withTooltip />
    </div>
  )
}

export const Portfolio = () => {
  // share layout with all portfolio routes to prevent sidebar flickering when navigating between the pages
  return (
    <Layout withBottomNav>
      <Header text={<Site.ConnectedAccountsPill />} nav={<AccountAvatar />} />
      <Content>
        <Suspense fallback={<SuspenseTracker name="Portfolio" />}>
          <PortfolioProvider>
            <NomPoolStakingBannerProvider>
              <Routes>
                <Route path="assets" element={<PortfolioAssets />} />
                <Route path=":symbol" element={<PortfolioAsset />} />
                <Route path="" element={<PortfolioAccounts />} />
              </Routes>
              <Suspense>
                <BraveWarningPopupBanner />
              </Suspense>
              <Suspense>
                <MigratePasswordAlert />
              </Suspense>
              <Suspense>
                <AnalyticsAlert />
              </Suspense>
            </NomPoolStakingBannerProvider>
          </PortfolioProvider>
        </Suspense>
      </Content>
    </Layout>
  )
}
