import { Suspense, useEffect } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { NftsBreadcrumb } from "@ui/domains/Portfolio/Nfts/NftsBreadcrumb"
import { PopupNftCollection } from "@ui/domains/Portfolio/Nfts/PopupNftCollection"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { useAnalytics } from "@ui/hooks/useAnalytics"

import { PortfolioAssetsHeader } from "./shared/PortfolioAssetsHeader"

export const PortfolioNftCollection = () => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("portfolio NFT collection")
  }, [popupOpenEvent])

  return (
    <>
      <PortfolioAssetsHeader backBtnTo={"/portfolio/nfts"} />
      <PortfolioTabs className="mt-4" />

      <Suspense fallback={<SuspenseTracker name="PortfolioNftCollection.TabContent" />}>
        <NftsBreadcrumb />
        <PopupNftCollection />
      </Suspense>
    </>
  )
}
