import { Balances } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { cn } from "@talismn/util"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useBalances, useIsBalanceInitializing } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { type FC, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSubnetLeaderboard, useTaoPrice } from "../hooks/useSn45Api"
import { Skeleton } from "../shared/Skeleton"
import { raoToTao } from "../shared/util"
import { BITTENSOR_NETWORK_ID } from "./constants"

export const TaoDashboardHeader = () => {
  const { t } = useTranslation()

  const tao = useToken(subNativeTokenId(BITTENSOR_NETWORK_ID))
  const ownedBalances = useBalances("owned")
  const { data: taoPrice, isLoading: isTaoPriceLoading } = useTaoPrice()
  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useSubnetLeaderboard("1d")

  const taoBalances = useMemo(() => {
    if (!tao) return new Balances([])
    return ownedBalances.find({ tokenId: tao.id })
  }, [ownedBalances, tao])

  const isInitializing = useIsBalanceInitializing()

  const isBalanceLoading = useMemo(() => {
    return isInitializing || taoBalances.each.some((b) => b.status === "cache")
  }, [isInitializing, taoBalances])

  const isStatsLoading = isTaoPriceLoading || isLeaderboardLoading

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
    const taoUsd = taoPrice?.price ? parseFloat(taoPrice.price) : 0
    if (taoUsd <= 0) return 0n

    const stakedUsd = ownedBalances.each
      .filter(
        (b) =>
          b.token?.type === "substrate-dtao" &&
          b.token.networkId === BITTENSOR_NETWORK_ID &&
          b.free.planck > 0n
      )
      .reduce((sum, b) => sum + (b.free.fiat("usd") ?? 0), 0)

    return BigInt(Math.round((stakedUsd / taoUsd) * 1e9))
  }, [ownedBalances, taoPrice])

  return (
    <div className="flex items-center rounded-[12px] border border-grey-800 px-3 py-4">
      <div className="flex shrink-0 items-center gap-2 px-1.5">
        <BalanceStat
          label={t("Total Tao Balance")}
          tokenId={tao?.id}
          planck={taoBalances.sum.planck.transferable}
          isLoading={isBalanceLoading}
          className="pr-8"
        />
        <BalanceStat
          label={t("Staked Tao Balance")}
          tokenId={tao?.id}
          planck={totalStakedPlanck}
          isLoading={isBalanceLoading || isTaoPriceLoading}
          className="pr-8"
        />
      </div>

      <div className="flex flex-1 items-center justify-end border-grey-800 border-l px-8 py-3">
        <div className="flex items-start gap-28">
          <MarketStat
            label={t("Total Market Cap")}
            value={<FiatFromUsd amount={stats.marketCap} compact noCountUp />}
            change={stats.marketCapChange24h ?? undefined}
            isLoading={isStatsLoading}
          />
          <MarketStat
            label={t("Total Subnet Volume")}
            value={<FiatFromUsd amount={stats.totalSubnetVolume} compact noCountUp />}
            isLoading={isStatsLoading}
          />
          <MarketStat
            label={t("TAO Price")}
            value={<FiatFromUsd amount={stats.taoUsd} noCountUp />}
            change={stats.priceChange24h ?? undefined}
            isLoading={isStatsLoading}
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
  className?: string
}> = ({ label, tokenId, planck, isLoading, className }) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-body-secondary text-xs">{label}</span>
      <div className="px-1">
        {isLoading ? (
          <Skeleton className="h-[38px] w-48" />
        ) : (
          <span className="whitespace-nowrap font-semibold text-[32px] text-body leading-[1.2]">
            <TokensAndFiat tokenId={tokenId} planck={planck} noFiat noCountUp noSymbol isBalance />
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
}> = ({ label, value, change, isLoading }) => {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div className="flex flex-col gap-[8px]">
      <span className="text-body-secondary text-xs">{label}</span>
      {isLoading ? (
        <Skeleton className="h-[29px] w-32" />
      ) : (
        <span className="font-semibold text-[24px] text-body leading-[1.2]">{value}</span>
      )}
      {isLoading ? (
        <Skeleton className="h-[17px] w-16" />
      ) : change !== undefined ? (
        <span
          className={cn(
            "text-xs",
            isPositive && "text-green",
            isNegative && "text-red-500",
            !isPositive && !isNegative && "text-body-secondary"
          )}
        >
          {change > 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      ) : null}
    </div>
  )
}
