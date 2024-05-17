import { Balances } from "@extension/core"
import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { DashboardNfts } from "@ui/domains/Portfolio/AssetsTable/DashboardNfts"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"
import { FC, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Route, Routes, useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { NoAccountsFullscreen } from "./NoAccountsFullscreen"

const FullscreenPortfolioAssets = ({
  balances,
  isInitializing,
}: {
  balances: Balances
  isInitializing: boolean
}) => {
  const { t } = useTranslation()

  const currency = useSelectedCurrency()

  const {
    total: portfolio,
    transferable: available,
    unavailable: locked,
  } = useMemo(() => balances.sum.fiat(currency), [balances.sum, currency])

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
      <PortfolioTabs className="mb-6 mt-[3.8rem]" />
      <div>
        <Routes>
          <Route path="nfts" element={<DashboardNfts />} />
          <Route
            path="tokens"
            element={<DashboardAssetsTable balances={balances} isInitializing={isInitializing} />}
          />
          <Route
            path=""
            element={<DashboardAssetsTable balances={balances} isInitializing={isInitializing} />}
          />
        </Routes>
      </div>
    </>
  )
}

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

const PageContent = () => {
  const { networkBalances, evmNetworks, chains, accountType, isInitializing } = usePortfolio()
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

  return <FullscreenPortfolioAssets balances={balances} isInitializing={isInitializing} />
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
