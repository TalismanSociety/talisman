import { TALISMAN_WEB_APP_STAKING_URL } from "@core/constants"
import { Balances } from "@core/domains/balances/types"
import { ExternalLinkIcon, XIcon, ZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { FC, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { TokenLogo } from "../../Asset/TokenLogo"
import { AssetBalanceCellValue } from "../AssetBalanceCellValue"
import { useNomPoolStakingBanner } from "../NomPoolStakingContext"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalances } from "./usePortfolioSymbolBalances"

const AssetRowSkeleton: FC<{ className?: string }> = ({ className }) => {
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

const AssetRow = ({ balances }: AssetRowProps) => {
  const { t } = useTranslation()
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const status = useBalancesStatus(balances)

  const { token, rate, summary } = useTokenBalancesSummary(balances)
  const { showTokenNomPoolBanner, dismissNomPoolBanner } = useNomPoolStakingBanner()
  const showBanner = showTokenNomPoolBanner({
    token,
    addresses: Array.from(new Set(balances.each.map((b) => b.address))),
  })

  const navigate = useNavigate()
  const handleClick = useCallback(() => {
    if (!token) return
    navigate(
      `/portfolio/${encodeURIComponent(token.symbol)}${token.isTestnet ? "?testnet=true" : ""}`
    )
    genericEvent("goto portfolio asset", { from: "dashboard", symbol: token.symbol })
  }, [genericEvent, navigate, token])

  const handleClickStakingBanner = useCallback(() => {
    window.open(TALISMAN_WEB_APP_STAKING_URL)
    genericEvent("open web app staking from banner", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, token?.symbol])

  const handleDismissStakingBanner = useCallback(() => {
    dismissNomPoolBanner()
    genericEvent("dismiss staking banner", { from: "dashboard", symbol: token?.symbol })
  }, [genericEvent, dismissNomPoolBanner, token?.symbol])

  if (!token || !summary) return null

  return (
    <>
      {showBanner && (
        <div className="bg-primary-500 text-primary-500 flex h-[4.1rem] w-full cursor-pointer items-center justify-between rounded-t bg-opacity-10 px-8 text-sm">
          <button
            type="button"
            className="flex items-center gap-4"
            onClick={handleClickStakingBanner}
          >
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
                defaults="<Highlight>Earn yield on your {{symbol}}.</Highlight> This balance is
                eligible for Nomination Pool Staking via the Talisman Portal. <LinkIcon />"
                values={{ symbol: token.symbol }}
              />
            </div>
          </button>
          <button type="button" className="shrink-0">
            <XIcon onClick={handleDismissStakingBanner} />
          </button>
        </div>
      )}
      <button
        type="button"
        className={classNames(
          "text-body-secondary bg-grey-850 hover:bg-grey-800 mb-4 grid w-full grid-cols-[40%_30%_30%] text-left text-base",
          showBanner ? "rounded-b" : "rounded"
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
    </>
  )
}

type AssetsTableProps = {
  balances: Balances
}

const getSkeletonOpacity = (index: number) => {
  // tailwind parses files to find classes that it should include in it's bundle
  // so we can't dynamically compute the className
  switch (index) {
    case 0:
      return "opacity-100"
    case 1:
      return "opacity-80"
    case 2:
      return "opacity-60"
    case 3:
      return "opacity-40"
    case 4:
      return "opacity-30"
    case 5:
      return "opacity-20"
    case 6:
      return "opacity-10"
    default:
      return "opacity-0"
  }
}

export const DashboardAssetsTable = ({ balances }: AssetsTableProps) => {
  const { t } = useTranslation()
  // group by token (symbol)
  const { symbolBalances, skeletons } = usePortfolioSymbolBalances(balances)

  return (
    <div className="text-body-secondary min-w-[45rem] text-left text-base">
      <div className="mb-5 grid grid-cols-[40%_30%_30%] text-sm font-normal">
        <div>Asset</div>
        <div className="text-right">{t("Locked")}</div>
        <div className="text-right">{t("Available")}</div>
      </div>

      {symbolBalances.map(([symbol, b]) => (
        <AssetRow key={symbol} balances={b} />
      ))}
      {[...Array(skeletons).keys()].map((i) => (
        <AssetRowSkeleton key={i} className={getSkeletonOpacity(i)} />
      ))}
    </div>
  )
}
