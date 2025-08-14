import { isNetworkDot, isNetworkEth } from "@talismn/chaindata-provider"
import { isAccountAddressEthereum, isAccountAddressSs58 } from "extension-core"
import { FC, PropsWithChildren, ReactNode, Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { DashboardPortfolioHeader } from "@ui/domains/Portfolio/DashboardPortfolioHeader"
import { GetStarted } from "@ui/domains/Portfolio/GetStarted/GetStarted"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { usePortfolioGlobalData } from "@ui/state"

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
  const { networks } = usePortfolioGlobalData()
  const { selectedAccounts } = usePortfolioNavigation()

  const [chains, evmNetworks] = useMemo(() => {
    const chains = networks.filter(isNetworkDot)
    const evmNetworks = networks.filter(isNetworkEth)
    return [chains, evmNetworks]
  }, [networks])

  const [hasOnlyEthAccounts, hasOnlySs58Accounts] = useMemo(
    () => [
      !!selectedAccounts.length && selectedAccounts.every((a) => isAccountAddressEthereum(a)),
      !!selectedAccounts.length && selectedAccounts.every((a) => isAccountAddressSs58(a)),
    ],
    [selectedAccounts],
  )

  if (!selectedAccounts.length) return <GetStarted />

  if (!networks.length) return <EnableNetworkMessage />
  if (hasOnlySs58Accounts && !chains.length) return <EnableNetworkMessage type="substrate" />
  if (
    hasOnlyEthAccounts &&
    !evmNetworks.length &&
    !chains.filter((c) => c.account === "secp256k1").length
  )
    return <EnableNetworkMessage type="evm" />

  return <>{children}</>
}

export const PortfolioLayout: FC<
  PropsWithChildren & { toolbar?: ReactNode; header?: ReactNode }
> = ({ header, toolbar, children }) => {
  return (
    // "-mx-4 px-4" allows for portfolio staking badges to overflow, while keeping a consistant width limit and keep content centered
    <div className="-mx-4 w-full px-4">
      <div className="relative flex w-full flex-col gap-6">
        <Suspense
          fallback={<SuspenseTracker name="DashboardPortfolioLayout.PortfolioAccountCheck" />}
        >
          {header ?? <DashboardPortfolioHeader />}
          <PortfolioAccountCheck>
            <div className="flex h-16 w-full items-center justify-between gap-8 overflow-hidden">
              <PortfolioTabs className="text-md my-0 h-14 w-auto font-bold" />
              <div className="shrink-0">
                <Suspense fallback={<SuspenseTracker name="DashboardPortfolioLayout.Toolbar" />}>
                  {toolbar}
                </Suspense>
              </div>
            </div>
            <Suspense fallback={<SuspenseTracker name="DashboardPortfolioLayout.TabContent" />}>
              {children}
            </Suspense>
          </PortfolioAccountCheck>
        </Suspense>
      </div>
    </div>
  )
}
