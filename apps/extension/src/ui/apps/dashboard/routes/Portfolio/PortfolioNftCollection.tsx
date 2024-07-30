import { useEffect } from "react"

import { DashboardNftCollection } from "@ui/domains/Portfolio/Nfts/DashboardNftCollection"
import { NftsBreadcrumb } from "@ui/domains/Portfolio/Nfts/NftsBreadcrumb"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const PortfolioNftCollection = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return (
    <>
      <NftsBreadcrumb />
      <DashboardNftCollection />
    </>
  )
}
