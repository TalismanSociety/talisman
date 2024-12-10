import { bind } from "@react-rxjs/core"
import { FC, ReactNode, useEffect } from "react"
import { combineLatest } from "rxjs"

import {
  accounts$,
  accountsCatalog$,
  balancesHydrate$,
  portfolioSelectedAccounts$,
  remoteConfig$,
  usePortfolio,
} from "@ui/state"

import { usePortfolioNavigation } from "./usePortfolioNavigation"

const [usePreload] = bind(
  combineLatest([balancesHydrate$, accounts$, accountsCatalog$, remoteConfig$]),
)

export const PortfolioContainer: FC<{ children: ReactNode; renderWhileLoading?: boolean }> = ({
  children,
  renderWhileLoading, // true in popup, false in dashboard
}) => {
  usePreload()

  const { selectedAccounts } = usePortfolioNavigation()
  const { isProvisioned } = usePortfolio()

  useEffect(() => {
    portfolioSelectedAccounts$.next(selectedAccounts)
  }, [selectedAccounts])

  // // on popup home page, portfolio is loading while we display the home page
  // // but on dashboard, don't render until portfolio is provisioned
  if (!renderWhileLoading && !isProvisioned) return null

  return <>{children}</>
}
