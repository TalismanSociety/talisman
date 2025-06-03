import { useEffect } from "react"

import { DashboardNfts } from "@ui/domains/Portfolio/Nfts/DashboardNfts"
import { NftsUnavailable } from "@ui/domains/Portfolio/Nfts/NftsUnavailable"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFeatureFlag } from "@ui/state"

export const PortfolioNfts = () => {
  const showNfts = useFeatureFlag("NFTS_V2")
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio NFTs")
  }, [pageOpenEvent])

  return showNfts ? <DashboardNfts /> : <NftsUnavailable />
}
