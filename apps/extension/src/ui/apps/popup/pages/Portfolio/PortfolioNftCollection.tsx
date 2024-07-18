import React, { Suspense, useEffect } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { PopupNftCollection } from "@ui/domains/Portfolio/Nfts/PopupNftCollection"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { useAnalytics } from "@ui/hooks/useAnalytics"

import { PortfolioAssetsHeader } from "./shared/PortfolioAssetsHeader"

export const PortfolioNftCollection = () => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("portfolio nft collection")
  }, [popupOpenEvent])

  return (
    <>
      <PortfolioAssetsHeader />
      <PortfolioTabs className="mb-6 mt-[3.8rem]" />
      <Suspense fallback={<SuspenseTracker name="PortfolioNftCollection.TabContent" />}>
        <PortfolioToolbarNfts />
        <div className="py-8">
          <PopupNftCollection />
        </div>
      </Suspense>
    </>
  )
}
