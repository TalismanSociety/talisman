import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { AssetDiscoveryPopupAlert } from "@ui/domains/AssetDiscovery/AssetDiscoveryPopupAlert"
import { EvmNetworkSelectPill } from "@ui/domains/Ethereum/EvmNetworkSelectPill"
import BraveWarningPopupBanner from "@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner"
import MigratePasswordAlert from "@ui/domains/Settings/MigratePasswordAlert"
import { ConnectedAccountsPill } from "@ui/domains/Site/ConnectedAccountsPill"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"
import { Suspense, useMemo } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { PopupContent, PopupHeader, PopupLayout } from "../../Layout/PopupLayout"
import { NoAccounts } from "../NoAccounts"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

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

const PortfolioContent = () => (
  <>
    <Routes>
      <Route path="assets" element={<PortfolioAssets />} />
      <Route path=":symbol" element={<PortfolioAsset />} />
      <Route path="" element={<PortfolioAccounts />} />
    </Routes>
    <Suspense fallback={null}>
      <BraveWarningPopupBanner />
      <MigratePasswordAlert />
    </Suspense>
  </>
)

const Header = () => {
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const isAuthorised = useMemo(
    () => currentSite?.id && authorisedSites[currentSite?.id],
    [authorisedSites, currentSite?.id]
  )

  return isAuthorised ? (
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

export const Portfolio = () => {
  const hasAccounts = useHasAccounts()
  return (
    <PopupLayout withBottomNav>
      <Header />
      <PopupContent>{hasAccounts === false ? <NoAccounts /> : <PortfolioContent />}</PopupContent>
      <Suspense fallback={<SuspenseTracker name="AssetDiscoveryPopupAlert" />}>
        <AssetDiscoveryPopupAlert />
      </Suspense>
    </PopupLayout>
  )
}
