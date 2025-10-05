import { classNames } from "@talismn/util"
import { FC, PropsWithChildren, Suspense, useEffect, useRef } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useAnalytics } from "@ui/hooks/useAnalytics"

import { BottomNav } from "../../components/Navigation/BottomNav"
import { NavigationDrawer } from "../../components/Navigation/NavigationDrawer"
import { PopupEarnPage } from "./PopupEarnPage"

const EarnRoutes = () => (
  <>
    <Routes>
      <Route path="" element={<PopupEarnPage />} />
    </Routes>
    <Suspense fallback={<SuspenseTracker name="EarnContent" />}>
      <BottomNav />
    </Suspense>
  </>
)

const Content: FC<PropsWithChildren> = ({ children }) => {
  // scrollToTop on location change
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

export const Earn = () => {
  const { popupOpenEvent } = useAnalytics()

  // Track analytics when earn page opens
  useEffect(() => {
    popupOpenEvent("earn")
  }, [popupOpenEvent])

  return (
    <div id="main" className="relative size-full overflow-hidden">
      <Content>
        <div className="flex size-full flex-col gap-4 py-8">
          <EarnRoutes />
        </div>
      </Content>
      <NavigationDrawer />
    </div>
  )
}
