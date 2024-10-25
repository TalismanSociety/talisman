import { LockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Balances } from "@extension/core"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { FadeIn } from "@talisman/components/FadeIn"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { Fiat } from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { NomPoolBondPillButton } from "@ui/domains/Staking/NomPoolBond/NomPoolBondPillButton"
import { useNomPoolBondButton } from "@ui/domains/Staking/NomPoolBond/useNomPoolBondButton"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useUniswapV2LpTokenTotalValueLocked } from "@ui/hooks/useUniswapV2LpTokenTotalValueLocked"
import { usePortfolio, useSelectedCurrency } from "@ui/state"

import { TokenLogo } from "../../Asset/TokenLogo"
import { StaleBalancesIcon } from "../StaleBalancesIcon"
import { usePortfolioDisplayBalances } from "../useDisplayBalances"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { NetworksLogoStack } from "./NetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalancesByFilter } from "./usePortfolioSymbolBalances"

type AssetRowProps = {
  balances: Balances
  locked?: boolean
}

const AssetRowSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={classNames(
        "bg-black-secondary flex h-28 items-center gap-6 rounded-sm px-6",
        className,
      )}
    >
      <div className="bg-grey-700 h-16 w-16 animate-pulse rounded-full px-6 text-xl"></div>
      <div className="grow space-y-1">
        <div className="flex justify-between gap-1">
          <div className="bg-grey-700 rounded-xs h-7 w-20 animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-7 w-[10rem] animate-pulse"></div>
        </div>
        <div className="flex justify-between gap-1">
          <div className="bg-grey-700 rounded-xs h-7 w-10 animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-7 w-[6rem] animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

const AssetRow = ({ balances, locked }: AssetRowProps) => {
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()

  const status = useBalancesStatus(balances)

  const { token, summary, rate } = useTokenBalancesSummary(balances)

  const navigate = useNavigateWithQuery()
  const handleClick = useCallback(() => {
    if (!token) return

    navigate(`/portfolio/tokens/${encodeURIComponent(token.symbol)}`)
    genericEvent("goto portfolio asset", { from: "popup", symbol: token.symbol })
  }, [genericEvent, navigate, token])

  const { tokens, fiat } = useMemo(() => {
    return {
      tokens: locked ? summary.lockedTokens : summary.availableTokens,
      fiat: locked ? summary.lockedFiat : summary.availableFiat,
    }
  }, [
    locked,
    summary.availableFiat,
    summary.availableTokens,
    summary.lockedFiat,
    summary.lockedTokens,
  ])

  const { t } = useTranslation()

  const isUniswapV2LpToken = token?.type === "evm-uniswapv2"
  const tvl = useUniswapV2LpTokenTotalValueLocked(token, rate, balances)

  const { canBondNomPool } = useNomPoolBondButton({ tokenId: token?.id, balances })
  const showStakingButton = canBondNomPool && !locked

  if (!token || !summary) return null

  return (
    <>
      <button
        type="button"
        className="bg-grey-850 hover:bg-grey-800 group flex h-28 w-full items-center rounded-sm"
        onClick={handleClick}
      >
        <div className="p-6 text-xl">
          <TokenLogo tokenId={token.id} />
        </div>
        <div className="relative flex grow items-center gap-4 pr-6">
          <div className="flex w-full flex-col gap-2 overflow-hidden text-left">
            <div className="flex items-center gap-3">
              <div className="text-body flex items-center gap-3 whitespace-nowrap text-sm font-bold">
                {token.symbol}
                {!!token.isTestnet && (
                  <span className="text-tiny bg-alert-warn/10 text-alert-warn rounded px-3 py-1 font-light">
                    {t("Testnet")}
                  </span>
                )}
              </div>
              {!!networkIds.length && (
                <div className="text-base">
                  <NetworksLogoStack networkIds={networkIds} max={3} />
                </div>
              )}
            </div>

            {isUniswapV2LpToken && typeof tvl === "number" && (
              <div className="text-body-secondary whitespace-nowrap text-xs">
                <Fiat amount={tvl} /> <span className="text-[0.8rem]">TVL</span>
              </div>
            )}
            {!isUniswapV2LpToken && typeof rate === "number" && (
              <Fiat amount={rate} className="text-body-secondary text-xs" />
            )}
          </div>
          <div
            className={classNames(
              "flex shrink-0 flex-col items-end gap-2 text-right",
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          >
            <>
              <div
                className={classNames(
                  "whitespace-nowrap text-sm font-bold",
                  locked ? "text-body-secondary" : "text-white",
                  showStakingButton && "group-hover:hidden",
                )}
              >
                <Tokens
                  amount={tokens}
                  symbol={isUniswapV2LpToken ? "" : token?.symbol}
                  isBalance
                />
                {locked ? <LockIcon className="lock ml-2 inline align-baseline text-xs" /> : null}
                <StaleBalancesIcon
                  className="alert ml-2 inline align-baseline text-sm"
                  staleChains={status.status === "stale" ? status.staleChains : []}
                />
              </div>
              <div
                className={classNames(
                  "text-body-secondary leading-base text-xs",
                  showStakingButton && "group-hover:hidden",
                )}
              >
                {fiat === null ? "-" : <Fiat amount={fiat} isBalance />}
              </div>
              {showStakingButton && (
                <NomPoolBondPillButton
                  tokenId={token.id}
                  balances={balances}
                  className="hidden group-hover:block"
                />
              )}
            </>
          </div>
        </div>
      </button>
    </>
  )
}

type GroupProps = {
  label: ReactNode
  fiatAmount: number
  className?: string
  children?: ReactNode
}

const BalancesGroup = ({ label, fiatAmount, className, children }: GroupProps) => {
  const { isOpen, toggle } = useOpenClose(true)

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className={classNames("flex cursor-pointer items-center gap-2 text-sm", className)}
        onClick={toggle}
      >
        <div className="text-body-secondary grow text-left">{label}</div>
        <div className="text-body-secondary truncate">
          <Fiat amount={fiatAmount} isBalance />
        </div>
        <div className="text-body-secondary text-md flex flex-col justify-center">
          <AccordionIcon isOpen={isOpen} />
        </div>
      </button>
      <Accordion alwaysRender isOpen={isOpen}>
        <div className="flex flex-col gap-4">{children}</div>
      </Accordion>
    </div>
  )
}

export const PopupAssetsTable = () => {
  const { t } = useTranslation()
  const { selectedAccount: account } = usePortfolioNavigation()

  const { isInitialising } = usePortfolio()
  const balances = usePortfolioDisplayBalances("network")

  // group by status by token (symbol)
  const { availableSymbolBalances: available, lockedSymbolBalances } =
    usePortfolioSymbolBalancesByFilter("search")

  const currency = useSelectedCurrency()

  // calculate totals
  const {
    total,
    transferable: totalAvailable,
    unavailable: totalLocked,
  } = useMemo(() => balances.sum.fiat(currency), [balances.sum, currency])

  if (!available.length && !lockedSymbolBalances.length && !isInitialising)
    return (
      <FadeIn>
        <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
          {account ? t("No assets to display for this account.") : t("No assets to display.")}
        </div>
      </FadeIn>
    )

  return (
    <FadeIn>
      <div>
        {!!account && (
          <>
            <div className="text-md flex items-center gap-2">
              <div className="text-body grow text-left">{t("Total")}</div>
              <div className="text-body-secondary truncate">
                <Fiat amount={total} isBalance />
              </div>
            </div>
            <div className="h-4" />
          </>
        )}
        <BalancesGroup label={t("Available")} fiatAmount={totalAvailable}>
          {available.map(([symbol, b]) => (
            <AssetRow key={symbol} balances={b} />
          ))}
          {isInitialising && <AssetRowSkeleton />}
          {!isInitialising && !available.length && (
            <div className="text-body-secondary bg-black-secondary rounded-sm py-10 text-center text-xs">
              {account
                ? t("There are no available balances for this account.")
                : t("There are no available balances.")}
            </div>
          )}
          <div className="h-4" />
        </BalancesGroup>
        {lockedSymbolBalances.length > 0 && (
          <BalancesGroup
            label={
              <div className="flex items-center gap-2">
                <div>{t("Locked")}</div>
                <div>
                  <LockIcon className="text-sm" />
                </div>
              </div>
            }
            fiatAmount={totalLocked}
          >
            {lockedSymbolBalances.map(([symbol, b]) => (
              <AssetRow key={symbol} balances={b} locked />
            ))}
          </BalancesGroup>
        )}
      </div>
    </FadeIn>
  )
}
