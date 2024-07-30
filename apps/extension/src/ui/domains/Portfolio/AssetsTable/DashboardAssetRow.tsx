import { ExternalLinkIcon, XIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Suspense, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Balances } from "@extension/core"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useShowStakingBanner } from "@ui/domains/Staking/useShowStakingBanner"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useUniswapV2LpTokenTotalValueLocked } from "@ui/hooks/useUniswapV2LpTokenTotalValueLocked"

import { TokenLogo } from "../../Asset/TokenLogo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"

const AssetRowStakingReminderInner = ({ balances }: AssetRowProps) => {
  const { t } = useTranslation()

  const { token, summary } = useTokenBalancesSummary(balances)
  const { message, colours, handleClickStakingBanner, handleDismissStakingBanner } =
    useShowStakingBanner(balances)

  if (!token || !summary) return null

  return (
    <div
      className={classNames(
        colours?.["text"],
        colours?.["background"],
        `flex h-[4.1rem] w-full cursor-pointer items-center justify-between rounded-t px-8 text-sm`
      )}
    >
      <button type="button" className="flex items-center gap-4" onClick={handleClickStakingBanner}>
        <ZapIcon className="shrink-0" />{" "}
        <div className="text-left">
          <Trans
            t={t}
            components={{
              Highlight: <span className="text-white" />,
              LinkIcon: (
                <span className="inline-flex shrink-0 flex-col justify-center">
                  <ExternalLinkIcon className="inline-block shrink-0" />
                </span>
              ),
            }}
            defaults="<Highlight>Earn yield on your {{symbol}}.</Highlight> {{message}} <LinkIcon />"
            values={{ symbol: token.symbol, message }}
          />
        </div>
      </button>
      <button type="button" className="shrink-0">
        <XIcon onClick={handleDismissStakingBanner} />
      </button>
    </div>
  )
}

const AssetRowStakingReminder = ({ balances }: AssetRowProps) => {
  const { showBanner } = useShowStakingBanner(balances)

  if (!showBanner) return null

  return <AssetRowStakingReminderInner balances={balances} />
}

type AssetRowProps = {
  balances: Balances
}

export const AssetRow = ({ balances }: AssetRowProps) => {
  const { t } = useTranslation()
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const status = useBalancesStatus(balances)
  const { token, rate, summary } = useTokenBalancesSummary(balances)

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (!token) return
    navigate(
      `/portfolio/tokens/${encodeURIComponent(token.symbol)}${
        token.isTestnet ? "?testnet=true" : ""
      }`
    )
    genericEvent("goto portfolio asset", { from: "dashboard", symbol: token.symbol })
  }, [genericEvent, navigate, token])

  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"
  const tvl = useUniswapV2LpTokenTotalValueLocked(token, rate, balances)

  if (!token || !summary) return null

  return (
    <div className="mb-4 overflow-hidden rounded">
      <Suspense>
        <AssetRowStakingReminder balances={balances} />
      </Suspense>

      <button
        type="button"
        className={classNames(
          "text-body-secondary bg-grey-850 hover:bg-grey-800  grid w-full grid-cols-[40%_30%_30%] text-left text-base"
        )}
        onClick={handleClick}
      >
        <div className="flex">
          <div className="shrink-0 p-8 text-xl">
            <TokenLogo tokenId={token.id} />
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="flex items-center gap-3">
              <div className="text-body flex items-center gap-4 text-base font-bold">
                {token.symbol}
                {!!token.isTestnet && (
                  <span className="text-tiny bg-alert-warn/10 text-alert-warn rounded px-3 py-1 font-light">
                    {t("Testnet")}
                  </span>
                )}
              </div>
              {!!networkIds.length && (
                <div>
                  <NetworksLogoStack networkIds={networkIds} max={3} />
                </div>
              )}
            </div>
            {isUniswapV2LpToken && typeof tvl === "number" && (
              <div className="text-body-secondary whitespace-nowrap">
                <Fiat amount={tvl} /> <span className="text-tiny">TVL</span>
              </div>
            )}
            {!isUniswapV2LpToken && typeof rate === "number" && (
              <Fiat amount={rate} className="text-body-secondary" />
            )}
          </div>
        </div>
        <div className="text-right">
          <AssetBalanceCellValue
            locked
            render={summary.lockedTokens.gt(0)}
            tokens={summary.lockedTokens}
            fiat={summary.lockedFiat}
            symbol={isUniswapV2LpToken ? "" : token.symbol}
            balancesStatus={status}
            className={classNames(
              "noPadRight",
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          />
        </div>
        <div className="text-right">
          <AssetBalanceCellValue
            render
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={isUniswapV2LpToken ? "" : token.symbol}
            balancesStatus={status}
            className={classNames(
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          />
        </div>
      </button>
    </div>
  )
}
