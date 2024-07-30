import { Token } from "@talismn/chaindata-provider"
import { SendIcon } from "@talismn/icons"
import { t } from "i18next"
import { FC, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Balances } from "@extension/core"
import { Breadcrumb } from "@talisman/components/Breadcrumb"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { DashboardAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolio } from "@ui/domains/Portfolio/usePortfolio"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import {
  BalanceSummary,
  useTokenBalancesSummary,
} from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { useUniswapV2LpTokenTotalValueLocked } from "@ui/hooks/useUniswapV2LpTokenTotalValueLocked"

const HeaderRow: FC<{
  token: Token | undefined
  summary: BalanceSummary
}> = ({ token, summary }) => {
  const { t } = useTranslation()
  const canHaveLockedState = Boolean(token?.chain?.id)

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
            />
            <Statistics
              className="h-auto w-auto items-end p-0"
              title={t("Available")}
              tokens={summary.availableTokens}
              fiat={summary.availableFiat}
              token={token}
              showTokens
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
  const { account } = useSelectedAccount()

  // don't set the token id here because it could be one of many
  const { canSendFunds, cannotSendFundsReason, openSendFundsPopup } = useSendFundsPopup(
    account,
    undefined,
    symbol
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
  balances: Balances
  symbol: string
  token: Token | undefined
  rate: number | null | undefined
}> = ({ balances, symbol, token, rate }) => {
  const { t } = useTranslation()

  const navigate = useNavigate()

  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"
  const tvl = useUniswapV2LpTokenTotalValueLocked(token, rate, balances)

  const items = useMemo(() => {
    return [
      {
        label: t("All Tokens"),
        onClick: () => navigate("/portfolio/tokens"),
      },
      {
        label: (
          <div className="flex items-center gap-2">
            <TokenLogo tokenId={token?.id} className="text-md" />
            <div className="text-body font-bold">{token?.symbol ?? symbol}</div>
            {isUniswapV2LpToken && typeof tvl === "number" && (
              <div className="text-body-secondary whitespace-nowrap">
                <Fiat amount={tvl} /> <span className="text-tiny">TVL</span>
              </div>
            )}
            {!isUniswapV2LpToken && typeof rate === "number" && (
              <Fiat amount={rate} className="text-body-secondary" />
            )}
          </div>
        ),
        onClick: undefined,
      },
    ]
  }, [t, token?.id, token?.symbol, symbol, isUniswapV2LpToken, tvl, rate, navigate])

  return (
    <div className="flex h-20 items-center justify-between">
      <Breadcrumb items={items} />
      <SendFundsButton symbol={symbol} />
    </div>
  )
}

export const PortfolioAsset = () => {
  const { symbol } = useParams()
  const [search] = useSearchParams()
  const { allBalances } = usePortfolio()
  const { pageOpenEvent } = useAnalytics()
  const isTestnet = search.get("testnet") === "true"

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    () => allBalances.find((b) => b.token?.symbol === symbol && b.token?.isTestnet === isTestnet),
    [allBalances, isTestnet, symbol]
  )

  const { token, rate, summary } = useTokenBalancesSummary(balances)
  const balancesToDisplay = useDisplayBalances(balances)

  useEffect(() => {
    pageOpenEvent("portfolio asset", { symbol })
  }, [pageOpenEvent, symbol])

  if (!symbol) return <Navigate to="/portfolio" />

  return (
    <>
      <TokenBreadcrumb token={token} rate={rate} balances={balances} symbol={symbol} />
      <HeaderRow token={token} summary={summary} />
      <DashboardAssetDetails balances={balancesToDisplay} symbol={symbol} />
    </>
  )
}
