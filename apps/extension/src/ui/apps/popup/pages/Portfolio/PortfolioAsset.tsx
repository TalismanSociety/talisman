import { Balances } from "@core/domains/balances/types"
import { IconButton } from "@talisman/components/IconButton"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { PopupAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"

const PageContent = ({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const { token } = useTokenBalancesSummary(balancesToDisplay)

  const handleBackBtnClick = useCallback(() => navigate("/portfolio/assets"), [navigate])

  const total = useMemo(() => balancesToDisplay.sum.fiat("usd").total, [balancesToDisplay])

  const { t } = useTranslation("portfolio")

  return (
    <>
      <div className="flex w-full items-center gap-4">
        <IconButton onClick={handleBackBtnClick}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="text-2xl">
          <TokenLogo tokenId={token?.id} />
        </div>
        <div className="flex grow flex-col gap-2 pl-2 text-sm">
          <div className="text-body-secondary flex justify-between">
            <div>{t("Asset")}</div>
            <div>{t("Total")}</div>
          </div>
          <div className="text-md flex justify-between font-bold">
            <div>{symbol}</div>
            <div>
              <Fiat amount={total} isBalance />
            </div>
          </div>
        </div>
      </div>
      <div className="py-12">
        <PopupAssetDetails balances={balancesToDisplay} symbol={symbol} />
      </div>
    </>
  )
}

export const PortfolioAsset = () => {
  const { symbol } = useParams()
  const [search] = useSearchParams()
  const { allBalances } = usePortfolio()
  const { popupOpenEvent } = useAnalytics()
  const isTestnet = search.get("testnet") === "true"

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    () => allBalances.find((b) => b.token?.symbol === symbol && b.token?.isTestnet === isTestnet),
    [allBalances, isTestnet, symbol]
  )

  useEffect(() => {
    popupOpenEvent("portfolio asset", { symbol })
  }, [popupOpenEvent, symbol])

  if (!symbol) return <Navigate to="/portfolio" />

  return <PageContent balances={balances} symbol={symbol} />
}
