import { ArrowDownRightIcon, ArrowUpRightIcon } from "@talismn/icons"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { Skeleton } from "@ui/domains/TaoDashboard/shared/Skeleton"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { formatCompactAlpha, formatCompactNumber } from "@ui/domains/TaoDashboard/shared/util"
import { cn } from "@ui/util/cn"
import type { FC, PropsWithChildren, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useTaoDashboardNetworkId } from "../../../shared/TaoDashboardNetworkProvider"
import { useFlowHeaderData } from "./useFlowChartData"

interface FlowChartHeaderProps {
  netuid: number
  period: TimePeriod
}

export const FlowChartHeader: FC<FlowChartHeaderProps> = ({ netuid, period }) => {
  const { t } = useTranslation()
  const { totals, alphaFlow, emissionPercent, dailyEmissions, distributionTrend, isLoading } =
    useFlowHeaderData(netuid, period)
  const { alphaToken } = useSubnetTokens(useTaoDashboardNetworkId(), netuid)

  if (isLoading) return <FlowChartHeaderSkeleton />

  return (
    <div className="flex h-25.5 flex-wrap items-center justify-between gap-4 px-12">
      <div className="flex w-full items-end justify-between gap-4">
        {/* Left side – Net Flow Display */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className={cn("font-bold text-xl", totals.net >= 0 ? "text-white" : "text-sell")}>
              {t("{{amount}}τ Net", {
                amount: `${totals.net >= 0 ? "+" : ""}${formatCompactNumber(totals.net)}`,
              })}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-body-secondary text-md">{t("EMA TAO flow")}</span>
            <span
              className={cn(
                "flex items-center gap-1 rounded-xs px-2 text-sm",
                distributionTrend === "accumulating" ? "bg-buy/10 text-buy" : "bg-sell/10 text-sell"
              )}
            >
              <span>{t("Distribution")}</span>
              {distributionTrend === "accumulating" && <ArrowUpRightIcon className="size-6" />}
              {distributionTrend === "distributing" && <ArrowDownRightIcon className="size-6" />}
            </span>
          </div>
        </div>

        {/* Right side – Stats */}
        <div className="flex h-full items-start gap-12">
          <Metric label={t("TAO Flow")}>
            <div className="flex flex-col">
              <span className="font-medium text-buy">
                {formatCompactAlpha(totals.taoIn, "τ")}{" "}
                <span className="text-body-disabled text-xs">{t("In")}</span>
              </span>
              <span className="font-medium text-sell">
                {formatCompactAlpha(totals.taoOut, "τ")}{" "}
                <span className="text-body-disabled text-xs">{t("Out")}</span>
              </span>
            </div>
          </Metric>

          <Metric label={t("Alpha Flow")}>
            <div className="flex flex-col">
              <span className="font-medium text-buy">
                {formatCompactAlpha(alphaFlow.alphaIn, alphaToken?.symbol)}{" "}
                <span className="text-body-disabled text-xs">{t("In")}</span>
              </span>
              <span className="font-medium text-sell">
                {formatCompactAlpha(alphaFlow.alphaOut, alphaToken?.symbol)}{" "}
                <span className="text-body-disabled text-xs">{t("Out")}</span>
              </span>
            </div>
          </Metric>

          <Metric label={t("Emissions")}>
            {emissionPercent !== null ? `${emissionPercent.toFixed(2)}%` : "0.00%"}
          </Metric>

          <Metric label={t("Em/Day")}>{formatCompactAlpha(dailyEmissions ?? 0, "τ")}</Metric>
        </div>
      </div>
    </div>
  )
}

const Metric: FC<PropsWithChildren<{ label: ReactNode }>> = ({ label, children }) => (
  <div className="flex flex-col items-start justify-between gap-2">
    <span className="text-body-disabled text-xs">{label}</span>
    <span className="font-medium text-md text-white">{children}</span>
  </div>
)

const MetricSkeleton: FC<{
  titleClassName?: string
  valueClassName?: string
  is3Rows?: boolean
}> = ({ titleClassName, valueClassName, is3Rows }) => (
  <div className="flex flex-col items-start justify-between gap-2">
    <Skeleton className={cn("h-8 w-32", titleClassName)} />
    <Skeleton className={cn("h-10 w-40", valueClassName)} />
    {is3Rows && <Skeleton className={cn("h-10 w-40", valueClassName)} />}
  </div>
)

const FlowChartHeaderSkeleton = () => (
  <div className="flex h-25.5 flex-wrap items-center justify-between gap-4 px-12">
    <div className="flex w-full items-start justify-between gap-4">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-14 w-96" />
        <Skeleton className="h-12 w-72" />
      </div>
      <div className="flex items-start gap-12">
        <MetricSkeleton titleClassName="w-28" valueClassName="w-36" is3Rows />
        <MetricSkeleton titleClassName="w-32" valueClassName="w-36" is3Rows />
        <MetricSkeleton titleClassName="w-28" valueClassName="w-24" />
        <MetricSkeleton titleClassName="w-20" valueClassName="w-28" />
      </div>
    </div>
  </div>
)
