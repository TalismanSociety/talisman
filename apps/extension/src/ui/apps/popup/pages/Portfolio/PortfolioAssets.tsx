import { isNetworkDot, isNetworkEth } from "@talismn/chaindata-provider"
import { isAccountAddressEthereum, isAccountAddressSs58 } from "extension-core"
import { FC, Suspense, useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useMatch } from "react-router-dom"
import { Button } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { PopupAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { PopupDefiPositions } from "@ui/domains/Portfolio/DeFi/PopupDefiPositions"
import { PopupNfts } from "@ui/domains/Portfolio/Nfts/PopupNfts"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { PortfolioToolbarDeFi } from "@ui/domains/Portfolio/PortfolioToolbarDeFi"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFeatureFlag, usePortfolioGlobalData } from "@ui/state"

import { PortfolioAssetsHeader } from "./shared/PortfolioAssetsHeader"

const EnableNetworkMessage: FC<{ type?: "substrate" | "evm" }> = ({ type }) => {
  const { t } = useTranslation()
  const handleClick = useCallback(() => {
    if (type === "substrate") api.dashboardOpen("/settings/networks-tokens/networks/polkadot")
    else if (type === "evm") api.dashboardOpen("/settings/networks-tokens/networks/ethereum")
    else api.dashboardOpen("/settings/networks-tokens/networks")
    window.close()
  }, [type])

  return (
    <div className="text-body-secondary mt-56 flex flex-col items-center justify-center gap-8 text-center">
      <div>{t("Enable some networks to display your assets")}</div>
      <div>
        <Button onClick={handleClick} primary small type="button">
          {t("Manage Networks")}
        </Button>
      </div>
    </div>
  )
}

const PopupAnalyticsEvent: FC<{ name: string }> = ({ name }) => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent(name)
  }, [name, popupOpenEvent])

  return null
}

const MainContent: FC = () => {
  const { networks } = usePortfolioGlobalData()
  const { selectedAccount: account } = usePortfolioNavigation()

  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")
  const matchDefi = useMatch("/portfolio/defi")

  const [chains, evmNetworks] = useMemo(() => {
    const chains = networks.filter(isNetworkDot)
    const evmNetworks = networks.filter(isNetworkEth)
    return [chains, evmNetworks]
  }, [networks])

  if (!account?.type && !networks.length) return <EnableNetworkMessage />
  if (isAccountAddressSs58(account) && !chains.length)
    return <EnableNetworkMessage type="substrate" />
  if (
    isAccountAddressEthereum(account) &&
    !evmNetworks.length &&
    !chains.filter((c) => c.account === "secp256k1").length
  )
    return <EnableNetworkMessage type="evm" />

  if (matchTokens)
    return (
      <>
        <PopupAssetsTable />
        <PopupAnalyticsEvent name="portfolio assets" />
      </>
    )
  if (matchNfts)
    return (
      <>
        <PopupNfts />
        <PopupAnalyticsEvent name="portfolio NFTs" />
      </>
    )
  if (matchDefi)
    return (
      <>
        <PopupDefiPositions />
        <PopupAnalyticsEvent name="portfolio DeFi" />
      </>
    )

  return null
}

export const PortfolioAssets = () => {
  return (
    <>
      <PortfolioAssetsHeader />
      <PortfolioTabs className="mt-4" />
      <Suspense fallback={<SuspenseTracker name="PortfolioAssets.TabContent" />}>
        <PortfolioAssetsToolbar />
        <MainContent />
      </Suspense>
    </>
  )
}

const PortfolioAssetsToolbar = () => {
  const showNfts = useFeatureFlag("NFTS_V2")
  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")
  const matchDefi = useMatch("/portfolio/defi")

  return (
    <>
      {!!matchTokens && <PortfolioToolbarTokens />}
      {!!matchDefi && <PortfolioToolbarDeFi />}
      {!!matchNfts && !!showNfts && <PortfolioToolbarNfts />}
    </>
  )
}
