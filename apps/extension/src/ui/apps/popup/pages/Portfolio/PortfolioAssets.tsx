import { FC, Suspense, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useMatch } from "react-router-dom"
import { Button } from "talisman-ui"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { api } from "@ui/api"
import { PopupAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { PopupNfts } from "@ui/domains/Portfolio/Nfts/PopupNfts"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"
import { PortfolioToolbarNfts } from "@ui/domains/Portfolio/PortfolioToolbarNfts"
import { PortfolioToolbarTokens } from "@ui/domains/Portfolio/PortfolioToolbarTokens"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useAnalytics } from "@ui/hooks/useAnalytics"

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

const MainContent: FC = () => {
  const { evmNetworks, chains } = usePortfolio()
  const { account } = useSelectedAccount()

  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")

  if (!account?.type && !evmNetworks.length && !chains.length) return <EnableNetworkMessage />
  if (account?.type === "sr25519" && !chains.length)
    return <EnableNetworkMessage type="substrate" />
  if (
    account?.type === "ethereum" &&
    !evmNetworks.length &&
    !chains.filter((c) => c.account === "secp256k1").length
  )
    return <EnableNetworkMessage type="evm" />

  if (matchTokens) return <PopupAssetsTable />
  if (matchNfts) return <PopupNfts />

  return null
}

const PageContent = () => {
  const matchTokens = useMatch("/portfolio/tokens")
  const matchNfts = useMatch("/portfolio/nfts")

  return (
    <>
      <PortfolioAssetsHeader backBtnTo={"/portfolio"} />
      <PortfolioTabs className="mb-6 mt-[3.8rem]" />
      <Suspense fallback={<SuspenseTracker name="PortfolioAssets.TabContent" />}>
        {!!matchTokens && <PortfolioToolbarTokens />}
        {!!matchNfts && <PortfolioToolbarNfts />}
        <div className="py-8">
          <MainContent />
        </div>
      </Suspense>
    </>
  )
}

export const PortfolioAssets = () => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("portfolio assets")
  }, [popupOpenEvent])

  return <PageContent />
}
