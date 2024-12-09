import { ZapFastIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { Balances } from "@extension/core"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { BondPillButton } from "@ui/domains/Staking/Bond/BondPillButton"
import { useBondButton } from "@ui/domains/Staking/Bond/useBondButton"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useUniswapV2LpTokenTotalValueLocked } from "@ui/hooks/useUniswapV2LpTokenTotalValueLocked"

import { TokenLogo } from "../../Asset/TokenLogo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"

type AssetRowProps = {
  balances: Balances
}

export const AssetRow = ({ balances }: AssetRowProps) => {
  const { t } = useTranslation()
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const status = useBalancesStatus(balances)
  const { token, rate, summary } = useTokenBalancesSummary(balances)

  const navigate = useNavigateWithQuery()
  const handleClick = useCallback(() => {
    if (!token) return
    navigate(`/portfolio/tokens/${encodeURIComponent(token.symbol)}`)
    genericEvent("goto portfolio asset", { from: "dashboard", symbol: token.symbol })
  }, [genericEvent, navigate, token])

  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"
  const tvl = useUniswapV2LpTokenTotalValueLocked(token, rate, balances)

  const { canBondNomPool } = useBondButton({ tokenId: token?.id, balances })

  if (!token || !summary) return null

  return (
    <div className="relative mb-4">
      <button
        type="button"
        className={classNames(
          "text-body-secondary bg-grey-850 hover:bg-grey-800 group grid h-[6.6rem] w-full grid-cols-[40%_30%_30%] overflow-hidden rounded text-left text-base",
        )}
        onClick={handleClick}
      >
        <div className="flex h-[6.6rem]">
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
        <div className="h-[6.6rem] text-right">
          <AssetBalanceCellValue
            locked
            render={summary.lockedTokens.gt(0)}
            tokens={summary.lockedTokens}
            fiat={summary.lockedFiat}
            symbol={isUniswapV2LpToken ? "" : token.symbol}
            balancesStatus={status}
            className={classNames(
              "noPadRight",
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          />
        </div>
        <div className="flex h-[6.6rem] flex-col items-end justify-center gap-2 text-right">
          {canBondNomPool && (
            <>
              <BondPillButton
                tokenId={token.id}
                balances={balances}
                className="[>svg]:text-[2rem] mr-8 hidden text-base group-hover:block"
              />
              <div className="absolute -right-5 -top-2 size-10 overflow-hidden rounded-full bg-black p-1">
                <div className="text-primary bg-primary/25 flex size-full items-center justify-center rounded-full text-xs">
                  <ZapFastIcon className="size-6" />
                </div>
              </div>
            </>
          )}
          <AssetBalanceCellValue
            render
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={isUniswapV2LpToken ? "" : token.symbol}
            balancesStatus={status}
            className={classNames(
              canBondNomPool && "group-hover:hidden",
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          />
        </div>
      </button>
    </div>
  )
}
