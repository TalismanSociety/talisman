import { FC, ReactNode, useEffect } from "react"

import { portfolioSelectedAccounts$, usePortfolio } from "@ui/state"

import { usePortfolioNavigation } from "./usePortfolioNavigation"

// const preloadAtom = atom((get) =>
//   Promise.all([
//     get(accountsByCategoryAtomFamily("all")),
//     get(remoteConfigAtom),
//     get(balancesHydrateAtom),
//     get(stakingBannerAtom),
//   ])
// )

export const PortfolioContainer: FC<{ children: ReactNode; renderWhileLoading?: boolean }> = ({
  children,
  renderWhileLoading, // true in popup, false in dashboard
}) => {
  // useAtomValue(preloadAtom) TODO

  const { selectedAccounts } = usePortfolioNavigation()
  const { isProvisioned } = usePortfolio()

  useEffect(() => {
    portfolioSelectedAccounts$.next(selectedAccounts)
  }, [selectedAccounts])

  // keeps portfolio sync atoms up to date with subscription async atoms
  // const isProvisioned = usePortfolioProvisioning()

  // // on popup home page, portfolio is loading while we display the home page
  // // but on dashboard, don't render until portfolio is provisioned
  if (!renderWhileLoading && !isProvisioned) return null

  // if (!isProvisioned) return null

  return <>{children}</>
}
