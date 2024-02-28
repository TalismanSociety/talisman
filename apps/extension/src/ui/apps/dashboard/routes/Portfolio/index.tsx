import {
  accountsByCategoryAtomFamily,
  balancesByAccountCategoryAtomFamily,
  balancesHydrateAtom,
} from "@ui/atoms"
import { remoteConfigAtom } from "@ui/atoms/remoteConfig"
import { stakingBannerAtom } from "@ui/atoms/stakingBanners"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { usePortfolioUpdateGlobalData } from "@ui/domains/Portfolio/usePortfolio"
import { atom, useAtomValue } from "jotai"
import { useEffect } from "react"
import { Route, Routes, useSearchParams } from "react-router-dom"

import { DashboardLayout } from "../../layout/DashboardLayout"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

const preloadAtom = atom((get) =>
  Promise.all([
    get(balancesByAccountCategoryAtomFamily("all")),
    get(accountsByCategoryAtomFamily("all")),
    get(remoteConfigAtom),
    get(balancesHydrateAtom),
    get(stakingBannerAtom),
  ])
)

const ContentRoutes = () => {
  useAtomValue(preloadAtom)

  // keeps portfolio sync atoms up to date with subscription async atoms
  const isProvisioned = usePortfolioUpdateGlobalData()

  // don't render if not ready, it would display the no account UI
  if (!isProvisioned) return null

  return (
    <Routes>
      {/* To match popup structure, in case of expand */}
      <Route path="/assets" element={<PortfolioAssets />} />
      <Route path=":symbol" element={<PortfolioAsset />} />
      <Route path="" element={<PortfolioAssets />} />
    </Routes>
  )
}

export const PortfolioRoutes = () => {
  const [searchParams, updateSearchParams] = useSearchParams()
  const { open: openBuyTokensModal } = useBuyTokensModal()

  useEffect(() => {
    const buyTokens = searchParams.get("buyTokens")
    if (buyTokens === null) return

    openBuyTokensModal()
    searchParams.delete("buyTokens")
    updateSearchParams(searchParams, { replace: true })
  }, [openBuyTokensModal, searchParams, updateSearchParams])

  return (
    // share layout to prevent sidebar flickering when navigating between the 2 pages
    <DashboardLayout centered large>
      <ContentRoutes />
    </DashboardLayout>
  )
}
