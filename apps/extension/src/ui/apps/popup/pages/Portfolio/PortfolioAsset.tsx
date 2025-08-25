import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { ChevronLeftIcon } from "@talismn/icons"
import { isTruthy } from "@talismn/util"
import { uniq } from "lodash-es"
import { useCallback, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { AssetPriceChart } from "@ui/domains/Asset/AssetPriceChart"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { PopupAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalances, usePortfolioBalances, useSelectedCurrency } from "@ui/state"

const PageContent = ({ balances, symbol }: { balances: Balances; symbol: string }) => {
  const navigate = useNavigate()
  const balancesToDisplay = useDisplayBalances(balances)
  const currency = useSelectedCurrency()

  const handleBackBtnClick = useCallback(() => navigate(-1), [navigate])

  const total = useMemo(
    () => balancesToDisplay.sum.fiat(currency).total,
    [balancesToDisplay.sum, currency],
  )

  const tokenIds = useMemo<TokenId[]>(
    () => uniq(balancesToDisplay.each.map((b) => b.token?.id).filter(isTruthy)),
    [balancesToDisplay],
  )

  const { t } = useTranslation()

  return (
    <>
      <div className="text-body flex h-[3.6rem] w-full items-center gap-4 text-base font-bold">
        <IconButton onClick={handleBackBtnClick}>
          <ChevronLeftIcon />
        </IconButton>
        <div className="shrink-0">{symbol}</div>
        <div className="flex grow items-center justify-end gap-3">
          <div className="text-body-secondary text-sm">{t("Total")}</div>
          <Fiat amount={total} isBalance />
        </div>
      </div>

      <div className="py-4">
        <AssetPriceChart tokenIds={tokenIds} variant="small" className="mb-8" />
        <PopupAssetDetails balances={balancesToDisplay} symbol={symbol} />
      </div>
    </>
  )
}

export const PortfolioAsset = () => {
  const { symbol } = useParams()
  const { selectedAccount: account } = usePortfolioNavigation()
  const allBalances = useBalances()
  const { networkBalances } = usePortfolioBalances()
  const { popupOpenEvent } = useAnalytics()

  const accountBalances = useMemo(
    () => (account ? allBalances.find((b) => b.address === account.address) : networkBalances),
    [account, allBalances, networkBalances],
  )

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    () => accountBalances.find((b) => b.token?.symbol === symbol),
    [accountBalances, symbol],
  )

  useEffect(() => {
    popupOpenEvent("portfolio asset", { symbol })
  }, [popupOpenEvent, symbol])

  if (!symbol) return <Navigate to="/portfolio" />

  return <PageContent balances={balances} symbol={symbol} />
}
