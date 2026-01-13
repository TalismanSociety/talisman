import { DashboardNftCollection } from "@ui/domains/Portfolio/Nfts/DashboardNftCollection"
import { NftsBreadcrumb } from "@ui/domains/Portfolio/Nfts/NftsBreadcrumb"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useEffect } from "react"

export const PortfolioNftCollection = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio NFT collection")
  }, [pageOpenEvent])

  return (
    <>
      <NftsBreadcrumb />
      <DashboardNftCollection />
    </>
  )
}
