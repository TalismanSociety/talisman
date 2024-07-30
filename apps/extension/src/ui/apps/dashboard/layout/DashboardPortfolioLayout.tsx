import { FC, PropsWithChildren, Suspense, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"

import { NoAccountsFullscreen } from "../routes/Portfolio/NoAccountsFullscreen"

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

export const DashboardPortfolioLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex w-full flex-col">
      <Suspense
        fallback={<SuspenseTracker name="DashboardPortfolioLayout.PortfolioAccountCheck" />}
      >
        <PortfolioAccountCheck>
          <PortfolioTabs className="text-md my-0 h-14 font-bold" />
          <Suspense fallback={<SuspenseTracker name="DashboardPortfolioLayout.TabContent" />}>
            <div className="flex w-full flex-col gap-12 py-12">{children}</div>
          </Suspense>
        </PortfolioAccountCheck>
      </Suspense>
    </div>
  )
}
