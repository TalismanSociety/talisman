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

export const PoweredBySn45 = () => {
  const { t } = useTranslation()
  return (
    <a
      href="https://taostats.io/subnets/netuid-45/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-grey-800 px-3 py-1.5 text-body-secondary text-xs transition-colors hover:bg-grey-750 hover:text-body"
    >
      <span>{t("Powered by")}</span>
      <span className="font-semibold text-primary">SN45</span>
    </a>
  )
}

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

  // Compute stats from TAO price and leaderboard data
  const stats = useMemo(() => {
    const taoUsd = taoPrice?.price ? parseFloat(taoPrice.price) : 0
    const subnets = leaderboardData?.subnets ?? []

    // TAO market cap from price feed
    const marketCap = taoPrice?.marketCap ?? 0

    // TAO price change
    const priceChange24h = taoPrice?.priceChange24h ?? null

    // Subnet volume from leaderboard (convert rao to TAO, then to USD)
    const totalSubnetVolume = subnets.reduce((sum, s) => sum + raoToTao(s.volume) * taoUsd, 0)

    // Market cap change
    const marketCapChange24h = taoPrice?.marketCapChange24h ?? null

    return { marketCap, marketCapChange24h, totalSubnetVolume, taoUsd, priceChange24h }
  }, [taoPrice, leaderboardData])

  return (
    <div className="flex h-auto min-h-64 items-center justify-between rounded-[0.75rem] border border-grey-800 px-16 text-left text-base text-body-secondary">
      <StatItem
        label={t("Available Tao")}
        value={
          <span>
            <TokensAndFiat
              tokenId={tao?.id}
              planck={taoBalances.sum.planck.transferable}
              noFiat
              noCountUp
              noSymbol
              isBalance
            />
            {" τ"}
          </span>
        }
        className={cn("w-[17rem]", isBalanceLoading && "animate-pulse")}
      />

      <div className="h-44 w-px shrink-0 bg-grey-800" />

      <StatItem
        label={t("Total Market Cap")}
        value={<FiatFromUsd amount={stats.marketCap} compact noCountUp />}
        change={stats.marketCapChange24h ?? undefined}
        isLoading={isStatsLoading}
        hasChange
        className="w-[17rem]"
      />
      <StatItem
        label={t("24h Trading Volume")}
        value={<FiatFromUsd amount={stats.totalSubnetVolume} compact noCountUp />}
        isLoading={isStatsLoading}
        className="w-[17rem]"
      />
      <StatItem
        label={t("TAO Price")}
        value={<FiatFromUsd amount={stats.taoUsd} noCountUp />}
        change={stats.priceChange24h ?? undefined}
        isLoading={isStatsLoading}
        hasChange
        className="w-[17rem]"
      />
    </div>
  )
}

// Stat item for the header
const StatItem: FC<{
  label: ReactNode
  value: ReactNode
  change?: number
  isLoading?: boolean
  hasChange?: boolean
  className?: string
}> = ({ label, value, change, isLoading, hasChange, className }) => {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-body-secondary text-sm">{label}</span>
      {isLoading ? (
        <Skeleton className="h-[3.9rem] w-64" />
      ) : (
        <span className="font-bold text-body text-xl">{value}</span>
      )}
      {isLoading && hasChange ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <span
          className={cn(
            "text-sm",
            change === undefined && "invisible",
            isPositive && "text-green",
            isNegative && "text-red-500",
            !isPositive && !isNegative && "text-body-secondary"
          )}
        >
          {change !== undefined ? (
            <>
              {change > 0 ? "+" : ""}
              {change.toFixed(2)}%
            </>
          ) : (
            "—"
          )}
        </span>
      )}
    </div>
  )
}
