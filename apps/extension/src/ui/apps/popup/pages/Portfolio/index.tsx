import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { EvmNetworkSelectPill } from "@ui/domains/Ethereum/EvmNetworkSelectPill"
import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import { NomPoolStakingBannerProvider } from "@ui/domains/Portfolio/NomPoolStakingContext"
import { ConnectedAccountsPill } from "@ui/domains/Site/ConnectedAccountsPill"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"
import { Suspense, lazy, useMemo } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { useCurrentSite } from "../../context/CurrentSiteContext"
import { PopupContent, PopupHeader, PopupLayout } from "../../Layout/PopupLayout"
import { NoAccounts } from "../NoAccounts"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import { PortfolioLearnMore, PortfolioLearnMoreHeader } from "./PortfolioLearnMore"
import { PortfolioTryTalisman, PortfolioTryTalismanHeader } from "./PortfolioTryTalisman"
import { PortfolioWhatsNew, PortfolioWhatsNewHeader } from "./PortfolioWhatsNew"

const BraveWarningPopupBanner = lazy(
  () => import("@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner")
)
const MigratePasswordAlert = lazy(() => import("@ui/domains/Settings/MigratePasswordAlert"))

export const Portfolio = () => {
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const isAuthorised = useMemo(
    () => Boolean(currentSite?.id && authorisedSites[currentSite?.id]),
    [authorisedSites, currentSite?.id]
  )
  const hasAccounts = useHasAccounts()

  return (
    <PortfolioProvider>
      <NomPoolStakingBannerProvider>
        {/* share layout to prevent sidebar flickering when navigating between the 2 pages */}
        <PopupLayout withBottomNav>
          <PortfolioHeader isAuthorised={isAuthorised} />
          <PopupContent>
            {hasAccounts && <HasAccountsPortfolioContent />}
            {!hasAccounts && <NoAccountsPortfolioContent />}
          </PopupContent>
        </PopupLayout>
      </NomPoolStakingBannerProvider>
    </PortfolioProvider>
  )
}

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

export const PortfolioHeader = ({ isAuthorised }: { isAuthorised?: boolean }) => (
  <Routes>
    <Route path="whats-new" element={<PortfolioWhatsNewHeader />} />
    <Route path="learn-more" element={<PortfolioLearnMoreHeader />} />
    <Route path="try-talisman" element={<PortfolioTryTalismanHeader />} />
    <Route
      path=""
      element={
        isAuthorised ? (
          <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-12">
            <ConnectedAccountsPill />
            <EvmNetworkSelectPill />
          </header>
        ) : (
          <PopupHeader right={<AccountAvatar />}>
            <ConnectedAccountsPill />
          </PopupHeader>
        )
      }
    />
  </Routes>
)

const HasAccountsPortfolioContent = () => (
  <>
    <Routes>
      <Route path="whats-new" element={<PortfolioWhatsNew />} />
      <Route path="learn-more" element={<PortfolioLearnMore />} />
      <Route path="try-talisman" element={<PortfolioTryTalisman />} />
      <Route path="assets" element={<PortfolioAssets />} />
      <Route path=":symbol" element={<PortfolioAsset />} />
      <Route path="" element={<PortfolioAccounts />} />
    </Routes>
    <Suspense fallback={null}>
      <BraveWarningPopupBanner />
      <MigratePasswordAlert />
      {/* <AnalyticsAlert /> */}
    </Suspense>
  </>
)

const NoAccountsPortfolioContent = () => (
  <Routes>
    <Route path="learn-more" element={<PortfolioLearnMore />} />
    <Route path="try-talisman" element={<PortfolioTryTalisman />} />
    <Route path="" element={<NoAccounts />} />
  </Routes>
)
