import { ErrorBoundary } from "@sentry/react"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren, Suspense, useEffect, useMemo, useRef } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { EvmNetworkSelectPill } from "@ui/domains/Ethereum/EvmNetworkSelectPill"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import BraveWarningPopupBanner from "@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner"
import MigratePasswordAlert from "@ui/domains/Settings/MigratePasswordAlert"
import { ConnectedAccountsPill } from "@ui/domains/Site/ConnectedAccountsPill"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"

import { BottomNav } from "../../components/Navigation/BottomNav"
import { NavigationDrawer } from "../../components/Navigation/NavigationDrawer"
import { NoAccounts } from "../NoAccounts"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import { PortfolioNftCollection } from "./PortfolioNftCollection"

const AuthorisedSiteToolbar = () => {
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const isAuthorised = useMemo(
    () => Boolean(currentSite?.id && authorisedSites[currentSite?.id]),
    [authorisedSites, currentSite?.id]
  )

  if (!isAuthorised) return null

  return (
    <>
      <div className="absolute left-0 top-0 z-20 flex w-full shrink-0 items-center justify-between gap-4 px-8 pt-8">
        <ConnectedAccountsPill />
        <EvmNetworkSelectPill />
      </div>
      <div className="h-[3.6rem] w-full"></div>
    </>
  )
}

const HasAccountsPortfolioContent = () => (
  <>
    <Routes>
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

const PortfolioContent = () => {
  const hasAccounts = useHasAccounts()
  return hasAccounts ? <HasAccountsPortfolioContent /> : <NoAccounts />
}

const Content: FC<PropsWithChildren> = ({ children }) => {
  //scrollToTop on location change
  const scrollableRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    scrollableRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <ScrollContainer ref={scrollableRef} className={classNames("size-full overflow-hidden px-8")}>
      {children}
    </ScrollContainer>
  )
}

export const Portfolio = () => (
  <PortfolioContainer renderWhileLoading>
    <div id="main" className="relative size-full overflow-hidden">
      <ErrorBoundary>
        <Content>
          <div className="flex w-full flex-col gap-4 py-8">
            <AuthorisedSiteToolbar />
            <PortfolioContent />
            <BottomNav />
          </div>
        </Content>
        <NavigationDrawer />
        {/* 
        TODO CHECK THIS
        <Suspense fallback={<SuspenseTracker name="AssetDiscoveryPopupAlert" />}>
          <AssetDiscoveryPopupAlert />
        </Suspense> */}
      </ErrorBoundary>
    </div>
  </PortfolioContainer>
)
