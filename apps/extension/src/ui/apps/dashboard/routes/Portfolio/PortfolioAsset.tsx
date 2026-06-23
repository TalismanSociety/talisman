import type { Balances } from "@talismn/balances"
import type { Token, TokenId } from "@talismn/chaindata-provider"
import { SendIcon } from "@talismn/icons"
import { Breadcrumb } from "@ui/components/Breadcrumb"
import { NavigateWithQuery } from "@ui/components/NavigateWithQuery"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AssetPriceChart } from "@ui/domains/Asset/AssetPriceChart"
import { DashboardAssetDetails } from "@ui/domains/Portfolio/AssetDetails"
import { BittensorClaimSettingsToolbarButton } from "@ui/domains/Portfolio/AssetDetails/BittensorClaimSettingsToolbarButton"
import { BittensorConvictionLockToolbarButton } from "@ui/domains/Portfolio/AssetDetails/BittensorConvictionLockToolbarButton"
import { BittensorDashboardToolbarButton } from "@ui/domains/Portfolio/AssetDetails/BittensorDashboardToolbarButton"
import { BittensorStakeToolbarButton } from "@ui/domains/Portfolio/AssetDetails/BittensorStakeToolbarButton"
import { BittensorUnstakeToolbarButton } from "@ui/domains/Portfolio/AssetDetails/BittensorUnstakeToolbarButton"
import { DashboardPortfolioHeader } from "@ui/domains/Portfolio/DashboardPortfolioHeader"
import { PortfolioToolbarButton } from "@ui/domains/Portfolio/PortfolioToolbarButton"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import {
  type BalanceSummary,
  useTokenBalancesSummary,
} from "@ui/domains/Portfolio/useTokenBalancesSummary"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useSendFundsPopup } from "@ui/hooks/useSendFundsPopup"
import { usePortfolioBalances } from "@ui/state/portfolio"
import { t } from "i18next"
import { uniq } from "lodash-es"
import { type FC, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

const HeaderRow: FC<{
  token: Token | undefined
  summary: BalanceSummary
}> = ({ token, summary }) => {
  const { t } = useTranslation()
  const canHaveLockedState = Boolean(token?.networkId)

  if (summary.totalTokens.isZero()) return null

  return (
    <div className="rounded bg-grey-850 p-8 text-left text-base text-body-secondary">
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
  symbol: string
  balances: Balances
}> = ({ symbol, balances }) => {
  const { t } = useTranslation()

  const navigate = useNavigateWithQuery()

  const items = useMemo(() => {
    return [
      {
        label: t("All Tokens"),
        onClick: () => navigate("/portfolio/tokens"),
      },
      {
        label: <div className="font-bold text-body">{symbol}</div>,
        onClick: undefined,
      },
    ]
  }, [t, symbol, navigate])

  return (
    <div className="flex h-20 items-center justify-between">
      <div className="grow">
        <Breadcrumb items={items} />
      </div>
      <div className="flex h-20 items-center gap-2">
        <BittensorClaimSettingsToolbarButton balances={balances} />
        <BittensorStakeToolbarButton balances={balances} />
        <BittensorUnstakeToolbarButton balances={balances} />
        <BittensorConvictionLockToolbarButton balances={balances} />
        <SendFundsButton symbol={symbol} />
        <BittensorDashboardToolbarButton balances={balances} />
      </div>
    </div>
  )
}

const usePortfolioAsset = () => {
  const { symbol } = useParams()
  const { allBalances } = usePortfolioBalances()

  const balances = useMemo(
    // TODO: Move the association between a token on multiple chains into the backend / subsquid.
    // We will eventually need to handle the scenario where two tokens with the same symbol are not the same token.
    () => allBalances.find((b) => b.token?.symbol === symbol),
    [allBalances, symbol]
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
      <TokenBreadcrumb symbol={symbol} balances={balancesToDisplay} />
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
      Boolean
    ) as TokenId[]
  }, [balances])

  // no chart to display, use default header
  if (!tokenIds.length) return <DashboardPortfolioHeader />

  return <AssetPriceChart tokenIds={tokenIds} variant="large" />
}
