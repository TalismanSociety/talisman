import { FC, PropsWithChildren, Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { DashboardPortfolioHeader } from "@ui/domains/Portfolio/DashboardPortfolioHeader"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"
import { usePortfolio } from "@ui/state"

import { NoAccountsFullscreen } from "./NoAccountsFullscreen"

const EnableNetworkMessage: FC<{ type?: "substrate" | "evm" }> = ({ type }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (type === "substrate") navigate("/settings/networks-tokens/networks/polkadot")
    else if (type === "evm") navigate("/settings/networks-tokens/networks/ethereum")
    else navigate("/settings/networks-tokens/networks")
  }, [navigate, type])

  return (
    <div className="text-body-secondary mt-72 flex flex-col items-center justify-center gap-8 text-center">
      <div>{t("Enable some networks to display your assets")}</div>
      <div>
        <Button onClick={handleClick} primary small type="button">
          {t("Manage Networks")}
        </Button>
      </div>
    </div>
  )
}

const PortfolioAccountCheck: FC<PropsWithChildren> = ({ children }) => {
  const { evmNetworks, chains, accountType } = usePortfolio()
  const hasAccounts = useHasAccounts()

  if (!hasAccounts)
    return (
      <div className="mt-[3.8rem] flex grow items-center justify-center">
        <NoAccountsFullscreen />
      </div>
    )

  if (!accountType && !evmNetworks.length && !chains.length) return <EnableNetworkMessage />
  if (accountType === "sr25519" && !chains.length) return <EnableNetworkMessage type="substrate" />
  if (
    accountType === "ethereum" &&
    !evmNetworks.length &&
    !chains.filter((c) => c.account === "secp256k1").length
  )
    return <EnableNetworkMessage type="evm" />

  return <>{children}</>
}

export const PortfolioLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="relative flex w-full flex-col gap-6 pb-12">
      <Suspense
        fallback={<SuspenseTracker name="DashboardPortfolioLayout.PortfolioAccountCheck" />}
      >
        <PortfolioAccountCheck>
          <DashboardPortfolioHeader />
          <div className="flex h-16 w-full items-center justify-between gap-8 overflow-hidden">
            <PortfolioTabs className="text-md my-0 h-14 w-auto font-bold" />
            <div id="portfolio-toolbar" className="shrink-0">
              {/* 
                Toolbars are route specific, injected using react portal
                This allows us to keep Tabs here and prevent flickering when switching between tabs
               */}
            </div>
          </div>
          <Suspense fallback={<SuspenseTracker name="DashboardPortfolioLayout.TabContent" />}>
            {children}
          </Suspense>
        </PortfolioAccountCheck>
      </Suspense>
    </div>
  )
}
