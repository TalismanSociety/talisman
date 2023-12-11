import { Balances } from "@core/domains/balances/types"
import { classNames } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { TokenLogo } from "../../Asset/TokenLogo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { AssetRowStakingReminderWrapper } from "./AssetRowStakingReminderWrapper"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"

export const AssetRowSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={classNames(
        "text-body-secondary bg-grey-850 mb-4 grid w-full grid-cols-[40%_30%_30%] rounded text-left text-base",
        className
      )}
    >
      <div>
        <div className="flex h-[6.6rem]">
          <div className="p-8 text-xl">
            <div className="bg-grey-700 h-16 w-16 animate-pulse rounded-full"></div>
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="bg-grey-700 rounded-xs h-8 w-20 animate-pulse"></div>
          </div>
        </div>
      </div>
      <div></div>
      <div>
        <div className="flex h-full flex-col items-end justify-center gap-2 px-8">
          <div className="bg-grey-700 rounded-xs h-8 w-[10rem] animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-8 w-[6rem] animate-pulse"></div>
        </div>
      </div>
    </div>
  )
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
      `/portfolio/${encodeURIComponent(token.symbol)}${token.isTestnet ? "?testnet=true" : ""}`
    )
    genericEvent("goto portfolio asset", { from: "dashboard", symbol: token.symbol })
  }, [genericEvent, navigate, token])

  if (!token || !summary) return null

  return (
    <>
      <AssetRowStakingReminderWrapper
        balances={balances}
        render={(showStakingReminder) => (
          <button
            type="button"
            className={classNames(
              "text-body-secondary bg-grey-850 hover:bg-grey-800 mb-4 grid w-full grid-cols-[40%_30%_30%] text-left text-base",
              showStakingReminder ? "rounded-b" : "rounded"
            )}
            onClick={handleClick}
          >
            <div className="">
              <div className="flex">
                <div className="p-8 text-xl">
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
                  {rate !== undefined && <Fiat amount={rate} className="text-body-secondary" />}
                </div>
              </div>
            </div>
            <div className="text-right">
              <AssetBalanceCellValue
                locked
                render={summary.lockedTokens.gt(0)}
                tokens={summary.lockedTokens}
                fiat={summary.lockedFiat}
                symbol={token.symbol}
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
                symbol={token.symbol}
                balancesStatus={status}
                className={classNames(
                  status.status === "fetching" && "animate-pulse transition-opacity"
                )}
              />
            </div>
          </button>
        )}
      />
    </>
  )
}
