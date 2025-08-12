import { Suspense, useEffect } from "react"
import { useParams } from "react-router-dom"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { PopupDefiPosition } from "@ui/domains/Portfolio/DeFi/PopupDefiPosition"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { useAnalytics } from "@ui/hooks/useAnalytics"

import { PortfolioAssetsHeader } from "./shared/PortfolioAssetsHeader"

export const PortfolioDefiPosition = () => {
  const { popupOpenEvent } = useAnalytics()
  const { positionId } = useParams()

  useEffect(() => {
    popupOpenEvent("portfolio Defi position")
  }, [popupOpenEvent])

  return (
    <>
      <PortfolioAssetsHeader backBtnTo={"/portfolio/defi"} />
      <PortfolioTabs className="mt-4" />

      <Suspense fallback={<SuspenseTracker name="PortfolioDefiPosition.TabContent" />}>
        {/* <NftsBreadcrumb /> */}
        <PopupDefiPosition positionId={positionId} />
      </Suspense>
    </>
  )
}
