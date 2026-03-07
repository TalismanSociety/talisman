import type { Balances } from "@talismn/balances"
import { LockIcon, TrendingUpIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Accordion, AccordionIcon } from "@ui/components/Accordion"
import { FadeIn } from "@ui/components/FadeIn"
import { PillButton } from "@ui/components/PillButton"
import { useScrollContainer } from "@ui/components/ScrollContainer"
import { AssetPrice } from "@ui/domains/Asset/AssetPrice"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BondPillButton } from "@ui/domains/Staking/Bond/BondPillButton"
import { useBondButton } from "@ui/domains/Staking/Bond/hooks/useBondButton"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useUniswapV2LpTokenTotalValueLocked } from "@ui/hooks/useUniswapV2LpTokenTotalValueLocked"
import { useNetworkById } from "@ui/state/chaindata"
import { usePortfolioGlobalData } from "@ui/state/portfolio"
import { useSelectedCurrency } from "@ui/state/settings"
import { type FC, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { TokenLogo } from "../../Asset/TokenLogo"
import { StaleBalancesIcon } from "../StaleBalancesIcon"
import { usePortfolioDisplayBalances } from "../useDisplayBalances"
import { usePortfolioEarnButton } from "../usePortfolioEarnButton"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { PortfolioNetworksLogoStack } from "./PortfolioNetworksLogoStack"
import { usePortfolioNetworkIds } from "./usePortfolioNetworkIds"
import { usePortfolioSymbolBalancesByFilter } from "./usePortfolioSymbolBalances"

const AssetRowSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={classNames(
        "mt-4 flex h-28 items-center gap-6 rounded-sm bg-black-secondary px-6",
        className
      )}
    >
      <div className="h-16 w-16 animate-pulse rounded-full bg-grey-700 px-6 text-xl"></div>
      <div className="grow space-y-1">
        <div className="flex justify-between gap-1">
          <div className="h-7 w-20 animate-pulse rounded-xs bg-grey-700"></div>
          <div className="h-7 w-[10rem] animate-pulse rounded-xs bg-grey-700"></div>
        </div>
        <div className="flex justify-between gap-1">
          <div className="h-7 w-10 animate-pulse rounded-xs bg-grey-700"></div>
          <div className="h-7 w-[6rem] animate-pulse rounded-xs bg-grey-700"></div>
        </div>
      </div>
    </div>
  )
}

const AssetRow: FC<{
  balances: Balances
  noCountUp: boolean
  locked?: boolean
}> = ({ balances, locked, noCountUp }) => {
  const networkIds = usePortfolioNetworkIds(balances)
  const { genericEvent } = useAnalytics()
  const { selectedAccount } = usePortfolioNavigation()

  const status = useBalancesStatus(balances)

  const { token, summary, rate } = useTokenBalancesSummary(balances)
  const network = useNetworkById(token?.networkId)

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
  const tvl = useUniswapV2LpTokenTotalValueLocked(token, rate?.price, balances)

  const { canBond } = useBondButton({ balances })
  const showStakingButton = canBond && !locked
  const { canEarn, openEarnModal } = usePortfolioEarnButton(balances)

  if (!token || !summary || !network) return null

  return (
    <div className="group relative h-28 w-full">
      <button
        type="button"
        className="flex size-full items-center overflow-hidden rounded-sm bg-grey-850 hover:bg-grey-800"
        onClick={handleClick}
      >
        <div className="shrink-0 p-6 text-xl">
          <TokenLogo tokenId={token.id} />
        </div>
        <div className="relative flex grow items-center gap-4 overflow-hidden pr-6">
          <div className="flex grow flex-col gap-2 overflow-hidden text-left">
            <div className="flex w-full items-center gap-3 overflow-hidden">
              <div className="flex w-full items-center gap-3 overflow-hidden font-bold text-body text-sm">
                <div className="truncate">
                  <TokenDisplaySymbol tokenId={token.id} />
                </div>
                {!!network.isTestnet && (
                  <div className="shrink-0 rounded bg-alert-warn/10 px-3 py-1 font-light text-alert-warn text-tiny">
                    {t("Testnet")}
                  </div>
                )}
                {!!networkIds.length && (
                  <div className="shrink-0 text-base">
                    <PortfolioNetworksLogoStack networkIds={networkIds} max={3} />
                  </div>
                )}
              </div>
            </div>

            {isUniswapV2LpToken && typeof tvl === "number" && (
              <div className="whitespace-nowrap text-body-secondary text-xs">
                <Fiat amount={tvl} noCountUp={noCountUp} />{" "}
                <span className="text-[0.8rem]">TVL</span>
              </div>
            )}
            {!isUniswapV2LpToken && (
              <AssetPrice tokenId={token.id} balances={balances} className="text-xs" />
            )}
          </div>
          <div
            className={classNames(
              "flex min-w-[8rem] shrink-0 flex-col items-end gap-2 text-right",
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          >
            <div
              className={classNames(
                "whitespace-nowrap font-bold text-sm",
                locked ? "text-body-secondary" : "text-white",
                selectedAccount?.type !== "watch-only" &&
                  (canEarn || showStakingButton) &&
                  "group-hover:hidden"
              )}
            >
              <Tokens
                amount={tokens}
                symbol={isUniswapV2LpToken ? "" : token?.symbol}
                noCountUp={noCountUp}
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
                "text-body-secondary text-xs leading-base",
                selectedAccount?.type !== "watch-only" &&
                  (canEarn || showStakingButton) &&
                  "group-hover:hidden"
              )}
            >
              {fiat === null ? "-" : <Fiat amount={fiat} isBalance noCountUp={noCountUp} />}
            </div>
          </div>
        </div>
      </button>

      {showStakingButton ? (
        <div className="absolute top-0 right-4 hidden h-28 flex-col justify-center group-hover:flex">
          <BondPillButton
            balances={balances}
            isPortfolio
            className="text-base [>svg]:text-[2rem]"
          />
        </div>
      ) : canEarn ? (
        <div className="absolute top-0 right-4 hidden h-28 flex-col justify-center group-hover:flex">
          <PillButton
            onClick={openEarnModal}
            className="h-16 rounded-[28px] bg-primary/10 px-4 font-light text-base text-primary hover:bg-primary/20 [>svg]:text-[2rem]"
          >
            <div className="flex items-center gap-4">
              <TrendingUpIcon className="shrink-0 text-base" />
              <div>{t("Earn")}</div>
            </div>
          </PillButton>
        </div>
      ) : null}
    </div>
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
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className={classNames("flex cursor-pointer items-center gap-2 text-sm", className)}
        onClick={toggle}
      >
        <div className="grow text-left text-body-secondary">{label}</div>
        <div className="truncate text-body-secondary">
          <Fiat amount={fiatAmount} isBalance />
        </div>
        <div className="flex flex-col justify-center text-body-secondary text-md">
          <AccordionIcon isOpen={isOpen} />
        </div>
      </button>
      <Accordion alwaysRender isOpen={isOpen}>
        {children}
      </Accordion>
    </div>
  )
}

export const PopupAssetsTable = () => {
  const { t } = useTranslation()
  const { selectedAccount: account } = usePortfolioNavigation()

  const { isInitialising } = usePortfolioGlobalData()
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
        <div className="rounded-sm bg-black-secondary py-10 text-center text-body-secondary text-xs">
          {account ? t("No assets to display for this account.") : t("No assets to display.")}
        </div>
      </FadeIn>
    )

  return (
    <FadeIn>
      <div>
        {!!account && (
          <>
            <div className="flex items-center gap-2 text-md">
              <div className="grow text-left text-body">{t("Total")}</div>
              <div className="truncate text-body-secondary">
                <Fiat amount={total} isBalance />
              </div>
            </div>
            <div className="h-4" />
          </>
        )}
        <BalancesGroup label={t("Available")} fiatAmount={totalAvailable}>
          <VirtualizedRows rows={available} />
          {isInitialising && <AssetRowSkeleton />}
          {!isInitialising && !available.length && (
            <div className="rounded-sm bg-black-secondary py-10 text-center text-body-secondary text-xs">
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
            <VirtualizedRows
              key="locked"
              rows={lockedSymbolBalances}
              locked
              // workaround bug in the virtualizer: first few rows arent always rendered here
              // there shouldnt be many locked row anyways
              overscan={lockedSymbolBalances.length}
            />
          </BalancesGroup>
        )}
      </div>
    </FadeIn>
  )
}

const VirtualizedRows: FC<{ rows: [string, Balances][]; locked?: boolean; overscan?: number }> = ({
  rows,
  locked,
  overscan,
}) => {
  const [noCountUp, setNoCountUp] = useState(false)
  const { ref: refContainer } = useScrollContainer()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      // we only want count up on the first rendering of the table
      // ex: sorting or filtering rows using search box should not trigger count up
      setNoCountUp(true)
    }, 500)

    return () => clearTimeout(timeout)
  }, [])

  const virtualizer = useVirtualizer({
    count: rows.length,
    overscan: overscan ?? 5,
    gap: 8,
    estimateSize: () => 56,
    getScrollElement: () => refContainer.current,
  })

  return (
    <div ref={ref}>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            className="absolute top-0 left-0 h-28 w-full"
            style={{
              transform: `translateY(${item.start}px)`,
            }}
          >
            {!!rows[item.index] && (
              <AssetRow balances={rows[item.index][1]} locked={locked} noCountUp={noCountUp} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
