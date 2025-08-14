import { bind } from "@react-rxjs/core"
import { FC, PropsWithChildren, useEffect } from "react"
import { combineLatest } from "rxjs"

import {
  authorisedSites$,
  preloadBalances$,
  remoteConfig$,
  setPortfolioSelectedAccounts,
  usePortfolioGlobalData,
} from "@ui/state"

import { PortfolioNavigationProvider, usePortfolioNavigation } from "./usePortfolioNavigation"

const [usePreload] = bind(combineLatest([preloadBalances$, remoteConfig$, authorisedSites$]))

export const PortfolioContainer: FC<PropsWithChildren<{ renderWhileLoading?: boolean }>> = ({
  children,
  renderWhileLoading, // true in popup, false in dashboard
}) => {
  usePreload()

  return (
    <PortfolioNavigationProvider>
      <SelectedAccountsGuard>
        <ProvisionedPortfolioGuard renderWhileLoading={renderWhileLoading}>
          {children}
        </ProvisionedPortfolioGuard>
      </SelectedAccountsGuard>
    </PortfolioNavigationProvider>
  )
}

const ProvisionedPortfolioGuard: FC<PropsWithChildren<{ renderWhileLoading?: boolean }>> = ({
  children,
  renderWhileLoading,
}) => {
  const { isProvisioned } = usePortfolioGlobalData()

  // on popup home page, portfolio is loading while we display the home page
  // but on dashboard, don't render until portfolio is provisioned
  return !renderWhileLoading && !isProvisioned ? null : children
}

const SelectedAccountsGuard: FC<PropsWithChildren> = ({ children }) => {
  const { selectedAccounts } = usePortfolioNavigation()

  useEffect(() => {
    setPortfolioSelectedAccounts(selectedAccounts)
  }, [selectedAccounts])

  return children
}
