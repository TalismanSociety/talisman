import { ChevronLeftIcon } from "@talismn/icons"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { Balances } from "@extension/core"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { PopupAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useTokenBalancesSummary } from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useUniswapV2LpTokenTotalValueLocked } from "@ui/hooks/useUniswapV2LpTokenTotalValueLocked"
import { useBalances, usePortfolio, useSelectedCurrency, useSetting } from "@ui/state"

const PageContent = ({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const currency = useSelectedCurrency()
  const { token, rate } = useTokenBalancesSummary(balancesToDisplay)

  const handleBackBtnClick = useCallback(() => navigate(-1), [navigate])

  const total = useMemo(
    () => balancesToDisplay.sum.fiat(currency).total,
    [balancesToDisplay.sum, currency],
  )

  const { t } = useTranslation()

  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"
  const tvl = useUniswapV2LpTokenTotalValueLocked(token, rate, balances)

  return (
    <>
      <div className="flex w-full items-center gap-4">
        <IconButton onClick={handleBackBtnClick}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="shrink-0 text-2xl">
          <TokenLogo tokenId={token?.id} />
        </div>
        <div className="flex grow flex-col gap-1 overflow-hidden pl-2 text-sm">
          <div className="text-body-secondary flex justify-between">
            <div>{symbol}</div>
            <div>{t("Total")}</div>
          </div>
          <div className="text-md flex justify-between font-bold">
            {isUniswapV2LpToken && typeof tvl === "number" && (
              <Fiat className="overflow-hidden text-ellipsis whitespace-nowrap" amount={tvl} />
            )}
            {!isUniswapV2LpToken && typeof rate === "number" && (
              <Fiat className="overflow-hidden text-ellipsis whitespace-nowrap" amount={rate} />
            )}
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
  const { selectedAccount: account } = usePortfolioNavigation()
  const allBalances = useBalances()
  const { networkBalances } = usePortfolio()
  const { popupOpenEvent } = useAnalytics()
  const [withTestnets] = useSetting("useTestnets")

  const accountBalances = useMemo(
    () => (account ? allBalances.find((b) => b.address === account.address) : networkBalances),
    [account, allBalances, networkBalances],
  )

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    () =>
      accountBalances.find(
        (b) =>
          b.token?.symbol === symbol &&
          (!b.token?.isTestnet || b.token?.isTestnet === withTestnets),
      ),
    [accountBalances, symbol, withTestnets],
  )

  useEffect(() => {
    popupOpenEvent("portfolio asset", { symbol })
  }, [popupOpenEvent, symbol])

  if (!symbol) return <Navigate to="/portfolio" />

  return <PageContent balances={balances} symbol={symbol} />
}
