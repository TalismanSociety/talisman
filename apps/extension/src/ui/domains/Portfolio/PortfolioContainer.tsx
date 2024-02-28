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
  renderWhileLoading,
}) => {
  useAtomValue(preloadAtom)

  // keeps portfolio sync atoms up to date with subscription async atoms
  const isProvisioned = usePortfolioProvisioning()

  if (!renderWhileLoading && !isProvisioned) return null

  return <>{children}</>
}
