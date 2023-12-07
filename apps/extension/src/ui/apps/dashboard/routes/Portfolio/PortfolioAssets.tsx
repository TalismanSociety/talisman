import { Balances } from "@core/domains/balances/types"
import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { NetworkPicker } from "@ui/domains/Portfolio/NetworkPicker"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"
import { FC, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { NoAccountsFullscreen } from "./NoAccounts"

const FullscreenPortfolioAssets = ({ balances }: { balances: Balances }) => {
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const { portfolio, available, locked } = useMemo(() => {
    const { total, frozen, reserved, transferable } = balances.sum.fiat(currency)
    return {
      portfolio: total,
      available: transferable,
      locked: frozen + reserved,
    }
  }, [balances.sum, currency])

  return (
    <>
      <div className="flex w-full gap-8">
        <Statistics
          className="max-w-[40%]"
          title={t("Total Portfolio Value")}
          fiat={portfolio}
          showCurrencyToggle
        />
        <Statistics className="max-w-[40%]" title={t("Locked")} fiat={locked} locked />
        <Statistics className="max-w-[40%]" title={t("Available")} fiat={available} />
      </div>
      <div className="mt-[3.8rem]">
        <NetworkPicker />
      </div>
      <div className="mt-6">
        <DashboardAssetsTable balances={balances} />
      </div>
    </>
  )
}

const EnableNetworkMessage: FC<{ type?: "substrate" | "evm" }> = ({ type }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (type === "substrate") navigate("/networks/polkadot")
    else if (type === "evm") navigate("/networks/ethereum")
    else navigate("/networks")
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

const PageContent = () => {
  const { networkBalances, evmNetworks, chains, accountType } = usePortfolio()
  const balances = useDisplayBalances(networkBalances)
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

  return <FullscreenPortfolioAssets balances={balances} />
}

export const PortfolioAssets = () => {
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return (
    <div className="flex w-full flex-col">
      <PageContent />
    </div>
  )
}
