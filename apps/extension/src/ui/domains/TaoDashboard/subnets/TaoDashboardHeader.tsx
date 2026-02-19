import { Balances } from "@talismn/balances"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { cn } from "@talismn/util"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useBalances, useIsBalanceInitializing, useToken } from "@ui/state"
import { type FC, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useSubnetLeaderboard, useTaoPrice } from "../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "./constants"

// Format large USD values
const formatStatsUsd = (num: number) => {
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`
  return `$${num.toFixed(2)}`
}

// Stat item for the header
const StatItem: FC<{ label: ReactNode; value: ReactNode; change?: number }> = ({
  label,
  value,
  change,
}) => {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-secondary text-sm">{label}</span>
      <span className="font-bold text-body text-xl">{value}</span>
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
    </div>
  )
}

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
  const { data: taoPrice } = useTaoPrice()
  const { data: leaderboardData } = useSubnetLeaderboard("1d")

  const taoBalances = useMemo(() => {
    if (!tao) return new Balances([])
    return ownedBalances.find({ tokenId: tao.id })
  }, [ownedBalances, tao])

  const isInitializing = useIsBalanceInitializing()

  const isLoading = useMemo(() => {
    return isInitializing || taoBalances.each.some((b) => b.status === "cache")
  }, [isInitializing, taoBalances])

  // Compute stats from TAO price and leaderboard data
  const stats = useMemo(() => {
    const taoUsd = taoPrice?.price ? parseFloat(taoPrice.price) : 0
    const subnets = leaderboardData?.subnets ?? []

    // TAO market cap from price feed
    const marketCap = taoPrice?.marketCap ?? 0

    // TAO price change
    const priceChange24h = taoPrice?.priceChange24h ?? null

    // Subnet volume from leaderboard (convert rao to TAO, then to USD)
    const parseRao = (val: string | null | undefined) => (val ? Number(BigInt(val)) / 1e9 : 0)
    const totalSubnetVolume = subnets.reduce((sum, s) => sum + parseRao(s.volume) * taoUsd, 0)

    // Market cap change
    const marketCapChange24h = taoPrice?.marketCapChange24h ?? null

    return { marketCap, marketCapChange24h, totalSubnetVolume, taoUsd, priceChange24h }
  }, [taoPrice, leaderboardData])

  return (
    <div className="flex h-auto min-h-64 items-center justify-between rounded-[0.75rem] border border-grey-800 px-16 text-left text-base text-body-secondary">
      <StatItem
        label={t("Available Tao")}
        value={
          // TODO loading state
          <span className={cn(isLoading && "animate-pulse")}>
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
      />

      <div className="h-44 w-px shrink-0 bg-grey-800" />

      <StatItem
        label={t("Total Market Cap")}
        value={formatStatsUsd(stats.marketCap)}
        change={stats.marketCapChange24h ?? undefined}
      />
      <StatItem label={t("24h Trading Volume")} value={formatStatsUsd(stats.totalSubnetVolume)} />
      <StatItem
        label={t("TAO Price")}
        value={formatStatsUsd(stats.taoUsd)}
        change={stats.priceChange24h ?? undefined}
      />
    </div>
  )
}
