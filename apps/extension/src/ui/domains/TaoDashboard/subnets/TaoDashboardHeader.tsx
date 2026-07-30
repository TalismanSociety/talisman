import { Balances } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalances, useIsBalanceInitializing } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type FC, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSubnetLeaderboard, useTaoPrice } from "../hooks/useSn45Api"
import { Skeleton } from "../shared/Skeleton"
import { useTaoDashboardNetwork } from "../shared/TaoDashboardNetworkProvider"
import { raoToTao } from "../shared/util"

export const TaoDashboardHeader = () => {
  const { t } = useTranslation()

  const { networkId, isMainnet } = useTaoDashboardNetwork()
  const tao = useToken(subNativeTokenId(networkId))
  const allBalances = useBalances("all-except-contacts")
  const { selectedAccounts } = usePortfolioNavigation()

  const selectedBalances = useMemo(() => {
    const selectedAccountIds = new Set(selectedAccounts.map((a) => a.address))
    return allBalances.find((b) => selectedAccountIds.has(b.address))
  }, [allBalances, selectedAccounts])

  const {
    data: taoPrice,
    isLoading: isTaoPriceLoading,
    isRefetching: isTaoPriceRefetching,
  } = useTaoPrice()
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    isRefetching: isLeaderboardRefetching,
  } = useSubnetLeaderboard("1d")

  const taoBalances = useMemo(() => {
    if (!tao) return new Balances([])
    return selectedBalances.find({ tokenId: tao.id })
  }, [selectedBalances, tao])

  // Pre-filter to only dTAO balances on Bittensor so that totalStakedPlanck
  // does not recalculate when unrelated balances change.
  const dtaoBalances = useMemo(
    () =>
      selectedBalances.find(
        (b) => b.token?.type === "substrate-dtao" && b.token.networkId === networkId
      ),
    [selectedBalances, networkId]
  )

  const isInitializing = useIsBalanceInitializing()

  const hasCachedBalances = useMemo(
    () => taoBalances.each.some((b) => b.status === "cache"),
    [taoBalances]
  )
  const isBalanceRefetching = hasCachedBalances && !isInitializing

  const isStatsLoading = isTaoPriceLoading || isLeaderboardLoading
  const isStatsRefetching = isTaoPriceRefetching || isLeaderboardRefetching

  const stats = useMemo(() => {
    const taoUsd = taoPrice?.price ? parseFloat(taoPrice.price) : 0
    const subnets = leaderboardData?.subnets ?? []

    const marketCap = taoPrice?.marketCap ?? 0
    const priceChange24h = taoPrice?.priceChange24h ?? null
    const totalSubnetVolume = subnets.reduce((sum, s) => sum + raoToTao(s.volume) * taoUsd, 0)
    const marketCapChange24h = taoPrice?.marketCapChange24h ?? null

    return { marketCap, marketCapChange24h, totalSubnetVolume, taoUsd, priceChange24h }
  }, [taoPrice, leaderboardData])

  const totalStakedPlanck = useMemo(() => {
    // Use fiat("tao") to get the TAO-equivalent value directly from each dTAO balance,
    // avoiding the lossy USD round trip (alpha -> USD -> TAO). The "tao" rate is computed
    // from the on-chain alpha price without an intermediate USD division.
    const stakedTao = dtaoBalances.each
      .filter((b) => b.free.planck > 0n)
      .reduce((sum, b) => sum + (b.free.fiat("tao") ?? 0), 0)

    return BigInt(Math.round(stakedTao * 1e9))
  }, [dtaoBalances])

  // Total TAO portfolio: native TAO (free + reserved) + alpha tokens converted to TAO
  const totalPortfolioPlanck = useMemo(
    () => taoBalances.sum.planck.total + totalStakedPlanck,
    [taoBalances, totalStakedPlanck]
  )

  return (
    <div className="flex h-64 items-center rounded-[12px] border border-grey-800 px-8 py-4">
      <div className="flex shrink-0 items-center gap-2 px-1.5">
        <BalanceStat
          label={t("Total Tao Balance")}
          tokenId={tao?.id}
          planck={totalPortfolioPlanck}
          isLoading={isInitializing}
          isRefetching={isBalanceRefetching}
          className="pr-8"
        />
        <BalanceStat
          label={t("Staked Tao Balance")}
          tokenId={tao?.id}
          planck={totalStakedPlanck}
          isLoading={isInitializing || isTaoPriceLoading}
          isRefetching={isBalanceRefetching || isTaoPriceRefetching}
          unavailable={!isMainnet}
          className="pr-8"
        />
      </div>

      <div className="flex flex-1 items-center justify-end">
        <div className="flex items-start gap-28 border-grey-800 border-l py-3 pl-28">
          <MarketStat
            label={t("Total Market Cap")}
            value={<FiatFromUsd amount={stats.marketCap} compact noCountUp />}
            change={stats.marketCapChange24h ?? undefined}
            isLoading={isStatsLoading}
            isRefetching={isStatsRefetching}
            unavailable={!isMainnet}
          />
          <MarketStat
            label={t("Total Subnet Volume")}
            value={<FiatFromUsd amount={stats.totalSubnetVolume} compact noCountUp />}
            isLoading={isStatsLoading}
            isRefetching={isStatsRefetching}
            unavailable={!isMainnet}
          />
          <MarketStat
            label={t("TAO Price")}
            value={<FiatFromUsd amount={stats.taoUsd} noCountUp />}
            change={stats.priceChange24h ?? undefined}
            isLoading={isStatsLoading}
            isRefetching={isStatsRefetching}
            unavailable={!isMainnet}
          />
        </div>
      </div>
    </div>
  )
}

/** Large balance stat (32px value) for the left section */
const BalanceStat: FC<{
  label: string
  tokenId: string | undefined
  planck: bigint
  isLoading: boolean
  isRefetching?: boolean
  /** value derives from token rates, which have no source for this network */
  unavailable?: boolean
  className?: string
}> = ({ label, tokenId, planck, isLoading, isRefetching, unavailable, className }) => {
  if (unavailable)
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <span className="text-body-secondary text-xs">{label}</span>
        <span className="px-1 font-semibold text-3xl text-body-inactive leading-base">-</span>
      </div>
    )

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-body-secondary text-xs">{label}</span>
      <div className="px-1">
        {isLoading ? (
          <Skeleton className="h-9.5 w-48" />
        ) : (
          <span
            className={cn(
              "whitespace-nowrap font-semibold text-body text-xl leading-base",
              isRefetching && "animate-pulse"
            )}
          >
            <TokensAndFiat tokenId={tokenId} planck={planck} noFiat noSymbol isBalance />
            {" τ"}
          </span>
        )}
      </div>
    </div>
  )
}

/** Market stat (24px value) for the right section */
const MarketStat: FC<{
  label: ReactNode
  value: ReactNode
  change?: number
  isLoading?: boolean
  isRefetching?: boolean
  /** market data has no source for this network: render a dash instead of a zero value */
  unavailable?: boolean
}> = ({ label, value, change, isLoading, isRefetching, unavailable }) => {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const showSkeleton = isLoading && !value

  if (unavailable)
    return (
      <div className="flex flex-col gap-2">
        <span className="text-body-secondary text-xs">{label}</span>
        <span className="font-semibold text-body-inactive text-lg leading-base">-</span>
      </div>
    )

  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-secondary text-xs">{label}</span>
      {showSkeleton ? (
        <Skeleton className="h-7.25 w-32" />
      ) : (
        <span
          className={cn(
            "font-semibold text-body text-lg leading-base",
            isRefetching && "animate-pulse"
          )}
        >
          {value}
        </span>
      )}
      <span
        className={cn(
          "text-xs",
          showSkeleton && "invisible",
          change === undefined && "invisible",
          isPositive && "text-green",
          isNegative && "text-red-500",
          !isPositive && !isNegative && "text-body-secondary",
          isRefetching && "animate-pulse"
        )}
      >
        {change !== undefined ? (
          <>
            {change > 0 ? "+" : ""}
            {change.toFixed(2)}%
          </>
        ) : (
          "\u00A0"
        )}
      </span>
    </div>
  )
}
