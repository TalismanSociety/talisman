import { InfoIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useSubnetTradeFlow } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
import { TextSkeleton as Skeleton } from "@ui/domains/TaoDashboard/shared/Skeleton"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { formatCompactNumber, raoToTao } from "@ui/domains/TaoDashboard/shared/util"
import {
  type CSSProperties,
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { SectionTitleBar } from "./SectionTitleBar"

export const SignalsTradeFlow: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<TimePeriod>("1w")
  const { data: tradeFlow, isLoading } = useSubnetTradeFlow(netuid, period)

  return (
    <div>
      <SectionTitleBar label={t("Trade Flow")} period={period} onPeriodChange={setPeriod} />

      <div className="rounded-lg bg-grey-900 px-12 py-8">
        {isLoading ? <TradeFlowSkeleton /> : <TradeFlow tradeFlow={tradeFlow} />}
      </div>
    </div>
  )
}

type SubnetTradeFlowData = NonNullable<ReturnType<typeof useSubnetTradeFlow>["data"]>

const TradeFlow: FC<PropsWithChildren<{ tradeFlow: SubnetTradeFlowData | null | undefined }>> = ({
  tradeFlow,
}) => {
  const { t } = useTranslation()

  const metrics = useMemo(() => {
    if (!tradeFlow) {
      return {
        buys: 0,
        sells: 0,
        buyVol: 0,
        sellVol: 0,
        buyers: 0,
        sellers: 0,
        momentum: 0,
        accumulation: 0,
        tradeVelocity: 0,
      }
    }

    return {
      buys: tradeFlow.buys,
      sells: tradeFlow.sells,
      buyVol: raoToTao(tradeFlow.buyVol),
      sellVol: raoToTao(tradeFlow.sellVol),
      buyers: tradeFlow.buyers,
      sellers: tradeFlow.sellers,
      momentum: tradeFlow.momentum,
      accumulation: tradeFlow.accumulation,
      tradeVelocity: tradeFlow.tradeVelocity,
    }
  }, [tradeFlow])

  if (!tradeFlow)
    return (
      <div className="flex h-[12.5rem] items-center justify-center text-body-secondary">
        {t("Failed to fetch data")}
      </div>
    )

  return (
    <div className="flex h-[12.5rem] items-stretch gap-14">
      <div className="flex h-full w-[10rem] flex-col items-center justify-between">
        <ComparisonField
          labelLeft={t("Sells")}
          labelRight={t("Buys")}
          valueLeft={metrics.sells}
          valueRight={metrics.buys}
          contentLeft={metrics.sells}
          contentRight={metrics.buys}
        />
        <ComparisonField
          labelLeft={t("Sell Vol")}
          labelRight={t("Buy Vol")}
          valueLeft={metrics.sellVol}
          valueRight={metrics.buyVol}
          contentLeft={`τ${formatCompactNumber(metrics.sellVol, 0)}`}
          contentRight={`τ${formatCompactNumber(metrics.buyVol, 0)}`}
        />
        <ComparisonField
          labelLeft={t("Sellers")}
          labelRight={t("Buyers")}
          valueLeft={metrics.sellers}
          valueRight={metrics.buyers}
          contentLeft={metrics.sellers}
          contentRight={metrics.buyers}
        />
      </div>

      {/* Vertical Divider */}
      <div className="w-px self-stretch bg-grey-800" />

      <div className="flex h-full flex-col justify-between">
        <MetricField
          label={t("Momentum")}
          tooltip={t("Percentage change in price over the selected period")}
          className={cn(metrics.momentum > 0 && "text-buy", metrics.momentum <= 0 && "text-sell")}
        >
          {metrics.momentum > 0 && "+"}
          {metrics.momentum.toFixed(1)}%
        </MetricField>
        <MetricField
          label={t("Accumulation")}
          tooltip={t("Percentage of trading activity coming from buyers versus sellers")}
          className={cn(
            metrics.accumulation > 0 && "text-buy",
            metrics.accumulation <= 0 && "text-sell"
          )}
        >
          {metrics.accumulation > 0 && "+"}
          {metrics.accumulation.toFixed(1)}%
        </MetricField>
        <MetricField
          label={t("Trade Velocity")}
          tooltip={t(
            "How active trading is relative to a baseline period immediately preceding the selected window"
          )}
          className={cn(
            metrics.tradeVelocity > 0 && "text-buy",
            metrics.tradeVelocity <= 0 && "text-sell"
          )}
        >
          {metrics.tradeVelocity > 0 && "+"}
          {metrics.tradeVelocity.toFixed(1)}%
        </MetricField>
      </div>
    </div>
  )
}

const MetricField: FC<
  PropsWithChildren<{
    label: ReactNode
    tooltip?: ReactNode
    extra?: ReactNode
    className?: string
  }>
> = ({ label, tooltip, children, extra, className }) => (
  <div className={cn("flex flex-col gap-1")}>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-body-inactive text-xs">
          {label}
          {!!tooltip && <InfoIcon />}
        </div>
      </TooltipTrigger>
      {!!tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
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

const TradeFlowSkeleton = () => (
  <div className="flex h-[12.5rem] items-stretch gap-14">
    <div className="flex h-full w-[10rem] flex-col items-center justify-between">
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
        <Skeleton className="w-[3.125rem]" />
      </div>
    </div>
  )
}

const ComparisonFieldSkeleton = () => {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex w-full justify-between text-body-inactive text-xs">
        <div>
          <Skeleton className="w-[1.875rem]" />
        </div>
        <div>
          <Skeleton className="w-[1.875rem]" />
        </div>
      </div>
      <div className="flex w-full justify-between text-body text-md">
        <div>
          <Skeleton className="w-[3.125rem]" />
        </div>
        <div>
          <Skeleton className="w-[3.125rem]" />
        </div>
      </div>
      <Skeleton className="h-4 w-full rounded-full"></Skeleton>
    </div>
  )
}
