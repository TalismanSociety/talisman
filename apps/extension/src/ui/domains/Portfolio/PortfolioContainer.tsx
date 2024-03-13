import { accountsByCategoryAtomFamily, balancesHydrateAtom } from "@ui/atoms"
import { remoteConfigAtom } from "@ui/atoms/remoteConfig"
import { stakingBannerAtom } from "@ui/atoms/stakingBanners"
import { atom, useAtomValue } from "jotai"
import { FC, ReactNode } from "react"

import { usePortfolioProvisioning } from "./usePortfolio"

const preloadAtom = atom((get) =>
  Promise.all([
    get(accountsByCategoryAtomFamily("all")),
    get(remoteConfigAtom),
    get(balancesHydrateAtom),
    get(stakingBannerAtom),
  ])
)

export const PortfolioContainer: FC<{ children: ReactNode; renderWhileLoading?: boolean }> = ({
  children,
  renderWhileLoading, // true in popup, false in dashboard
}) => {
  useAtomValue(preloadAtom)

  // keeps portfolio sync atoms up to date with subscription async atoms
  const isProvisioned = usePortfolioProvisioning()

  // on popup home page, portfolio is loading while we display the home page
  // but on dashboard, don't render until portfolio is provisioned
  if (!renderWhileLoading && !isProvisioned) return null

  return <>{children}</>
}
