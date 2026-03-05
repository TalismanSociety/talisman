import { ArrowDownRightIcon, ArrowUpRightIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import { Skeleton } from "@ui/domains/TaoDashboard/shared/Skeleton"
import { formatCompactAlpha } from "@ui/domains/TaoDashboard/shared/util"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useRealtimeStakeEventsContext } from "../realtime/RealtimeStakeEventsProvider"
import { useRealtimeAlphaPrice } from "../realtime/useRealtimeAlphaPrice"
import { useSubnetStats } from "./useSubnetStats"

interface PriceChartHeaderProps {
  netuid: number
}

export const PriceChartHeader: FC<PriceChartHeaderProps> = ({ netuid }) => {
  const { t } = useTranslation()
  const {
    data: {
      tokenPrice: indexedPrice,
      tokenPriceUsd: indexedPriceUsd,
      taoUsdPrice,
      priceChange24h,
      marketCap,
      volume24h,
      fdv,
      dailyEmissions,
    },
    isLoading,
    isError,
  } = useSubnetStats(netuid)

  // Real-time price from SwapRuntimeApi.current_alpha_price, refreshed on each block
  const { bestBlockNumber } = useRealtimeStakeEventsContext()
  const { data: realtimePrice } = useRealtimeAlphaPrice(netuid, bestBlockNumber)

  // Prefer the on-chain real-time price when available
  const tokenPrice = realtimePrice ?? indexedPrice
  const tokenPriceUsd = realtimePrice && taoUsdPrice ? realtimePrice * taoUsdPrice : indexedPriceUsd

  if (isLoading) {
    return <PriceChartHeaderSkeleton />
  }

  return (
    <div className="flex h-[10.2rem] flex-wrap items-center justify-between gap-4 px-12">
      <div className="flex w-full items-end justify-between gap-4">
        <div className={cn(isError && "invisible")}>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-white text-xl">
              τ {tokenPrice?.toFixed(6) ?? "0.000000"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-body-secondary text-md">
              <FiatFromUsd amount={tokenPriceUsd} noCountUp />
            </span>
            {priceChange24h !== null && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-xs px-2 text-sm",
                  priceChange24h >= 0 ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"
                )}
              >
                <span>{Math.abs(priceChange24h).toFixed(2)}%</span>
                {priceChange24h > 0 && <ArrowUpRightIcon className="size-6" />}
                {priceChange24h < 0 && <ArrowDownRightIcon className="size-6" />}
              </span>
            )}
          </div>
        </div>

        <div className="flex h-full items-end gap-12">
          <Metric label={t("24h Volume")}>
            {isError || volume24h === null ? (
              t("N/A")
            ) : (
              <FiatFromUsd amount={volume24h} compact noCountUp />
            )}
          </Metric>
          <Metric label={t("Market Cap")}>
            {isError || marketCap === null ? (
              t("N/A")
            ) : (
              <FiatFromUsd amount={marketCap} compact noCountUp />
            )}
          </Metric>
          <Metric label={t("FDV")}>
            {isError || fdv === null ? t("N/A") : <FiatFromUsd amount={fdv} compact noCountUp />}
          </Metric>
          <Metric label={t("Em/Day")}>
            {isError ? t("N/A") : formatCompactAlpha(dailyEmissions ?? 0, "τ")}
          </Metric>
        </div>
      </div>
    </div>
  )
}

const PriceChartHeaderSkeleton = () => (
  <div className="flex h-[10.2rem] flex-wrap items-center justify-between gap-4 px-12">
    <div className="flex w-full items-end justify-between gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-14 w-96" />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Skeleton className="h-12 w-72" />
        </div>
      </div>
      <div className="flex items-center gap-12">
        <MetricSkeleton titleClassName="w-32" valueClassName="w-40" />
        <MetricSkeleton titleClassName="w-36" valueClassName="w-44" />
        <MetricSkeleton titleClassName="w-16" valueClassName="w-48" />
        <MetricSkeleton titleClassName="w-32" valueClassName="w-36" />
      </div>
    </div>
  </div>
)

const MetricSkeleton: FC<{ titleClassName?: string; valueClassName?: string }> = ({
  titleClassName,
  valueClassName,
}) => (
  <div className="flex flex-col items-start justify-between gap-2">
    <Skeleton className={cn("h-8 w-32", titleClassName)} />
    <Skeleton className={cn("h-10 w-40", valueClassName)} />
  </div>
)

const Metric: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => {
  return (
    <div className="flex flex-col items-start justify-between gap-2">
      <span className="text-body-disabled text-xs">{label}</span>
      <span className="font-medium text-md text-white">{children}</span>
    </div>
  )
}
