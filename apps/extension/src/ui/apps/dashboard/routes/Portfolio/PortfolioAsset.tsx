import { Token, TokenId } from "@talismn/chaindata-provider"
import { SendIcon } from "@talismn/icons"
import { t } from "i18next"
import { uniq } from "lodash"
import { FC, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Breadcrumb } from "@talisman/components/Breadcrumb"
import { NavigateWithQuery } from "@talisman/components/NavigateWithQuery"
import { AssetPriceChart } from "@ui/domains/Asset/AssetPriceChart"
import { DashboardAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { DashboardPortfolioHeader } from "@ui/domains/Portfolio/DashboardPortfolioHeader"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import {
  BalanceSummary,
  useTokenBalancesSummary,
} from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { usePortfolio, useSetting } from "@ui/state"

const HeaderRow: FC<{
  token: Token | undefined
  summary: BalanceSummary
}> = ({ token, summary }) => {
  const { t } = useTranslation()
  const canHaveLockedState = Boolean(token?.chain?.id)

  if (summary.totalTokens.isZero()) return null

  return (
    <div className="text-body-secondary bg-grey-850 rounded p-8 text-left text-base">
      <div className="grid grid-cols-[40%_30%_30%]">
        <Statistics
          className="h-auto w-auto p-0"
          title={t("Total Value")}
          tokens={summary.totalTokens}
          fiat={summary.totalFiat}
          token={token}
          showTokens
          align="left"
        />
        {canHaveLockedState ? (
          <>
            <Statistics
              className="h-auto w-auto items-end p-0 pr-8"
              title={t("Locked")}
              tokens={summary.lockedTokens}
              fiat={summary.lockedFiat}
              token={token}
              locked
              showTokens
              align="right"
            />
            <Statistics
              className="h-auto w-auto items-end p-0"
              title={t("Available")}
              tokens={summary.availableTokens}
              fiat={summary.availableFiat}
              token={token}
              showTokens
              align="right"
            />
          </>
        ) : (
          <>
            <div></div>
            <div></div>
          </>
        )}
      </div>
    </div>
  )
}

const SendFundsButton: FC<{ symbol: string }> = ({ symbol }) => {
  const { selectedAccount: account } = usePortfolioNavigation()

  // don't set the token id here because it could be one of many
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(
    account,
    undefined,
    symbol,
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PortfolioToolbarButton onClick={openSendFundsPopup} disabled={!canSendFunds}>
          <SendIcon />
        </PortfolioToolbarButton>
      </TooltipTrigger>
      <TooltipContent>
        {canSendFunds ? t("Send {{symbol}}", { symbol }) : cannotSendFundsReason}
      </TooltipContent>
    </Tooltip>
  )
}

const TokenBreadcrumb: FC<{
  symbol: string
}> = ({ symbol }) => {
  const { t } = useTranslation()

  const navigate = useNavigateWithQuery()

  const items = useMemo(() => {
    return [
      {
        label: t("All Tokens"),
        onClick: () => navigate("/portfolio/tokens"),
      },
      {
        label: <div className="text-body font-bold">{symbol}</div>,
        onClick: undefined,
      },
    ]
  }, [t, symbol, navigate])

  return (
    <div className="flex h-20 items-center justify-between">
      <Breadcrumb items={items} />
      <SendFundsButton symbol={symbol} />
    </div>
  )
}

const usePortfolioAsset = () => {
  const { symbol } = useParams()
  const { allBalances } = usePortfolio()
  const [isTestnet] = useSetting("useTestnets")

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    () => allBalances.find((b) => b.token?.symbol === symbol && (!b.token?.isTestnet || isTestnet)),
    [allBalances, isTestnet, symbol],
  )

  const { token, rate, summary } = useTokenBalancesSummary(balances)
  const balancesToDisplay = useDisplayBalances(balances)

  return { symbol, token, rate, balances, balancesToDisplay, summary }
}

export const PortfolioAsset = () => {
  const { symbol, token, balancesToDisplay, summary } = usePortfolioAsset()
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio asset", { symbol })
  }, [pageOpenEvent, symbol])

  if (!symbol) return <NavigateWithQuery url="/portfolio" />

  return (
    <>
      <TokenBreadcrumb symbol={symbol} />
      <HeaderRow token={token} summary={summary} />
      <DashboardAssetDetails balances={balancesToDisplay} symbol={symbol} />
    </>
  )
}

export const PortfolioAssetHeader = () => {
  const { balances } = usePortfolioAsset()

  // all tokenIds that match the symbol and have a coingeckoId
  const tokenIds = useMemo(() => {
    return uniq(balances.each.filter((b) => !!b.token?.coingeckoId).map((b) => b.token?.id)).filter(
      Boolean,
    ) as TokenId[]
  }, [balances])

  // no chart to display, use default header
  if (!tokenIds.length) return <DashboardPortfolioHeader />

  return <AssetPriceChart tokenIds={tokenIds} variant="large" />
}
