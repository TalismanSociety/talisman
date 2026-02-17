import { cn } from "@talismn/util"
import { useSubnetStakeEvents } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import {
  type CSSProperties,
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useMemo,
  useState,
} from "react"
import { Trans, useTranslation } from "react-i18next"
import { formatNumber, SectionTitleBar } from "./shared"

export const SignalsTradeFlow: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1W")
  const { data: stakeEvents, isLoading } = useSubnetStakeEvents(netuid)

  return (
    <div>
      <SectionTitleBar
        label={t("Trade Flow")}
        tooltip={<InfoTooltip />}
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="rounded-lg bg-grey-900 px-12 py-8">
        {isLoading ? (
          <StakeEventsSkeleton />
        ) : (
          <StakeEvents period={period} stakeEvents={stakeEvents} />
        )}
      </div>
    </div>
  )
}

const InfoTooltip = () => {
  const { t } = useTranslation()
  return (
    <div className="leading-paragraph">
      <Trans t={t}>
        <ul className="list-outside list-disc pl-8">
          <li>Momentum: % change in price over the period</li>
          <li>Accumulation: % of activity coming from buyers</li>
          <li>Trade Velocity: How active trading is relative to baseline</li>
        </ul>
      </Trans>
    </div>
  )
}

type SubnetStakeEventsData = NonNullable<ReturnType<typeof useSubnetStakeEvents>["data"]>

const StakeEvents: FC<
  PropsWithChildren<{ period: TimePeriod; stakeEvents: SubnetStakeEventsData | null | undefined }>
> = ({ period, stakeEvents }) => {
  const { t } = useTranslation()

  const metrics = useMemo(() => {
    if (!stakeEvents) {
      return {
        buys: 0,
        sells: 0,
        buyVol: 0,
        sellVol: 0,
        ratio: 1,
        ratioLabel: "Balanced",
        activeTraders: 0,
        buyers: 0,
        sellers: 0,
        avgTrade: 0,
        avgTradeLabel: "Retail flow",
      }
    }

    const now = Date.now()
    const periodMs =
      period === "1D"
        ? 24 * 60 * 60 * 1000
        : period === "1W"
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000

    const filtered = stakeEvents.filter((e) => new Date(e.timestamp).getTime() > now - periodMs)

    const buys = filtered.filter((e) => e.method === "Adding")
    const sells = filtered.filter((e) => e.method === "Removing")

    const buyVol = buys.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)
    const sellVol = sells.reduce((sum, e) => sum + parseFloat(e.taoAmount) / 1e9, 0)

    const ratio = sellVol > 0 ? buyVol / sellVol : buyVol > 0 ? 999 : 1

    const buyAddresses = new Set(buys.map((e) => e.coldkey).filter(Boolean))
    const sellAddresses = new Set(sells.map((e) => e.coldkey).filter(Boolean))
    const allAddresses = new Set([...buyAddresses, ...sellAddresses])

    const totalVol = buyVol + sellVol
    const avgTrade = filtered.length > 0 ? totalVol / filtered.length : 0

    let ratioLabel = "Balanced"
    if (ratio >= 1.2) ratioLabel = "Bullish"
    else if (ratio <= 0.8) ratioLabel = "Bearish"

    const avgTradeLabel = avgTrade >= 10 ? "Whale flow" : "Retail flow"

    return {
      buys: buys.length,
      sells: sells.length,
      buyVol,
      sellVol,
      ratio,
      ratioLabel,
      activeTraders: allAddresses.size,
      buyers: buyAddresses.size,
      sellers: sellAddresses.size,
      avgTrade,
      avgTradeLabel,
    }
  }, [stakeEvents, period])

  if (!stakeEvents)
    return (
      <div className="flex h-[20rem] items-center justify-center text-body-secondary">
        {t("Failed to fetch data")}
      </div>
    )

  return (
    <div className="flex h-[20rem] items-stretch gap-14">
      <div className="flex h-full w-[16rem] flex-col items-center justify-between">
        <ComparisonField
          labelLeft={t("Buys")}
          labelRight={t("Sells")}
          valueLeft={metrics.buys}
          valueRight={metrics.sells}
          contentLeft={metrics.buys}
          contentRight={metrics.sells}
        />
        <ComparisonField
          labelLeft={t("Buy Vol")}
          labelRight={t("Sell Vol")}
          valueLeft={metrics.buyVol}
          valueRight={metrics.sellVol}
          contentLeft={`τ${formatNumber(metrics.buyVol, 0)}`}
          contentRight={`τ${formatNumber(metrics.sellVol, 0)}`}
        />
        <ComparisonField
          labelLeft={t("Buyers")}
          labelRight={t("Sellers")}
          valueLeft={metrics.buyers}
          valueRight={metrics.sellers}
          contentLeft={metrics.buyers}
          contentRight={metrics.sellers}
        />
      </div>

      {/* Vertical Divider */}
      <div className="w-px self-stretch bg-grey-800" />

      <div className="flex h-full flex-col justify-between">
        <MetricField label={t("Ratio")} extra={metrics.ratioLabel}>
          {metrics.ratio.toFixed(2)}
        </MetricField>
        <MetricField label={t("Active Traders")} extra={t("Unique Wallets")}>
          {metrics.activeTraders}
        </MetricField>
        <MetricField label={t("Avg Trade")} extra={metrics.avgTradeLabel}>
          {metrics.avgTrade.toFixed(1)}τ
        </MetricField>
      </div>
    </div>
  )
}

const MetricField: FC<
  PropsWithChildren<{ label: ReactNode; extra?: ReactNode; className?: string }>
> = ({ label, children, extra, className }) => (
  <div className={cn("flex flex-col")}>
    <div className="text-body-inactive text-xs">{label}</div>
    <div className={cn("text-md", className)}>{children}</div>
    {!!extra && <div className="text-body-inactive text-xs">{extra}</div>}
  </div>
)

const ComparisonField: FC<{
  labelLeft: ReactNode
  labelRight: ReactNode
  valueLeft: number
  valueRight: number
  contentLeft: ReactNode
  contentRight: ReactNode
  className?: string
}> = ({ labelLeft, labelRight, valueLeft, valueRight, contentLeft, contentRight, className }) => {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex w-full justify-between text-body-inactive text-xs">
        <div>{labelLeft}</div>
        <div>{labelRight}</div>
      </div>
      <div className="flex w-full justify-between text-body text-md">
        <div>{contentLeft}</div>
        <div>{contentRight}</div>
      </div>
      <ComparisonBar
        leftValue={valueLeft}
        rightValue={valueRight}
        className={cn("w-full", className)}
      />
    </div>
  )
}

// Comparison bar showing two values side by side
const ComparisonBar: FC<{
  leftValue: number
  rightValue: number
  className?: string
}> = ({ leftValue, rightValue, className }) => {
  const leftStyle = useMemo<CSSProperties>(() => {
    const total = leftValue + rightValue
    const leftPercent = total > 0 ? (leftValue / total) * 100 : 50
    return { width: `${leftPercent.toFixed()}%` }
  }, [leftValue, rightValue])

  return (
    <div className={cn("flex h-2 w-full gap-1 overflow-hidden rounded-full", className)}>
      <div className="h-full shrink-0 bg-sell" style={leftStyle} />
      <div className="h-full grow bg-buy" />
    </div>
  )
}

const StakeEventsSkeleton = () => (
  <div className="flex h-[20rem] items-stretch gap-14">
    <div className="flex h-full w-[16rem] flex-col items-center justify-between">
      <ComparisonFieldSkeleton />
      <ComparisonFieldSkeleton />
      <ComparisonFieldSkeleton />
    </div>

    <div className="w-px self-stretch bg-grey-800" />

    <div className="flex h-full flex-col justify-between">
      <MetricFieldSkeleton />
      <MetricFieldSkeleton />
      <MetricFieldSkeleton />
    </div>
  </div>
)

const MetricFieldSkeleton = () => {
  return (
    <div className={cn("flex flex-col gap-1")}>
      <div className="text-body-inactive text-xs">
        <Skeleton className="w-[5rem]" />
      </div>
      <div className={cn("text-md")}>
        <Skeleton className="w-[4rem]" />
      </div>
      <div className="text-body-inactive text-xs">
        <Skeleton className="w-[7rem]" />
      </div>
    </div>
  )
}

const ComparisonFieldSkeleton = () => {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex w-full justify-between text-body-inactive text-xs">
        <div>
          <Skeleton className="w-[3rem]" />
        </div>
        <div>
          <Skeleton className="w-[3rem]" />
        </div>
      </div>
      <div className="flex w-full justify-between text-body text-md">
        <div>
          <Skeleton className="w-[5rem]" />
        </div>
        <div>
          <Skeleton className="w-[5rem]" />{" "}
        </div>
      </div>
      <Skeleton className="h-4 w-full rounded-full"></Skeleton>
    </div>
  )
}

const Skeleton: FC<PropsWithChildren<{ className?: string }>> = ({ className }) => (
  <div
    className={cn(
      "my-px h-[0.9em] shrink-0 animate-pulse rounded-xs bg-grey-800 text-grey-800",
      className
    )}
  />
)
