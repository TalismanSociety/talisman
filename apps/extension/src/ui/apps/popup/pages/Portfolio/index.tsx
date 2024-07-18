import { Suspense, useMemo } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { CurrentAccountAvatar } from "@ui/domains/Account/CurrentAccountAvatar"
import { AssetDiscoveryPopupAlert } from "@ui/domains/AssetDiscovery/AssetDiscoveryPopupAlert"
import { EvmNetworkSelectPill } from "@ui/domains/Ethereum/EvmNetworkSelectPill"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import BraveWarningPopupBanner from "@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner"
import MigratePasswordAlert from "@ui/domains/Settings/MigratePasswordAlert"
import { ConnectedAccountsPill } from "@ui/domains/Site/ConnectedAccountsPill"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"

import { PopupContent, PopupHeader, PopupLayout } from "../../Layout/PopupLayout"
import { NoAccounts } from "../NoAccounts"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import { PortfolioLearnMore, PortfolioLearnMoreHeader } from "./PortfolioLearnMore"
import { PortfolioNftCollection } from "./PortfolioNftCollection"
import { PortfolioTryTalisman, PortfolioTryTalismanHeader } from "./PortfolioTryTalisman"
import { PortfolioWhatsNew, PortfolioWhatsNewHeader } from "./PortfolioWhatsNew"

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

export const PortfolioHeader = () => {
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const isAuthorised = useMemo(
    () => Boolean(currentSite?.id && authorisedSites[currentSite?.id]),
    [authorisedSites, currentSite?.id]
  )

  return (
    <Routes>
      <Route path="whats-new" element={<PortfolioWhatsNewHeader />} />
      <Route path="learn-more" element={<PortfolioLearnMoreHeader />} />
      <Route path="try-talisman" element={<PortfolioTryTalismanHeader />} />
      <Route
        path="*"
        element={
          isAuthorised ? (
            <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-12">
              <ConnectedAccountsPill />
              <EvmNetworkSelectPill />
            </header>
          ) : (
            <PopupHeader right={<AccountAvatar />} />
          )
        }
      />
    </Routes>
  )
}

const HasAccountsPortfolioContent = () => (
  <>
    <Routes>
      <Route path="whats-new" element={<PortfolioWhatsNew />} />
      <Route path="learn-more" element={<PortfolioLearnMore />} />
      <Route path="try-talisman" element={<PortfolioTryTalisman />} />
      <Route path="tokens" element={<PortfolioAssets />} />
      <Route path="nfts/:collectionId" element={<PortfolioNftCollection />} />
      <Route path="nfts" element={<PortfolioAssets />} />
      <Route path="tokens/:symbol" element={<PortfolioAsset />} />
      <Route path="*" element={<PortfolioAccounts />} />
    </Routes>
    <Suspense fallback={null}>
      <BraveWarningPopupBanner />
      <MigratePasswordAlert />
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

const PortfolioContent = () => {
  const hasAccounts = useHasAccounts()
  return hasAccounts ? <HasAccountsPortfolioContent /> : <NoAccountsPortfolioContent />
}

export const Portfolio = () => (
  <PortfolioContainer renderWhileLoading>
    <PopupLayout withBottomNav>
      <PortfolioHeader />
      <PopupContent>
        <PortfolioContent />
      </PopupContent>
      <Suspense fallback={<SuspenseTracker name="AssetDiscoveryPopupAlert" />}>
        <AssetDiscoveryPopupAlert />
      </Suspense>
    </PopupLayout>
  </PortfolioContainer>
)
