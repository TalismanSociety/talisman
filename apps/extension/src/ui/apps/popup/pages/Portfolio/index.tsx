import { ErrorBoundary } from "@sentry/react"
import { classNames } from "@talismn/util"
import { FC, PropsWithChildren, Suspense, useEffect, useRef } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import BraveWarningPopupBanner from "@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner"
import MigratePasswordAlert from "@ui/domains/Settings/MigratePasswordAlert"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"

import { BottomNav } from "../../components/Navigation/BottomNav"
import { NavigationDrawer } from "../../components/Navigation/NavigationDrawer"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import { PortfolioNftCollection } from "./PortfolioNftCollection"
import { NoAccounts } from "./shared/NoAccounts"

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
          <div className="flex size-full flex-col gap-4 py-8">
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
