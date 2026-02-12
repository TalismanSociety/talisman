import { Icon } from "@iconify/react"
import { cn } from "@talismn/util"
import type { FC } from "react"

import { formatAlpha, formatCompactNumber } from "./formatters"
import { useFlowHeaderData } from "./useFlowChartData"

interface FlowChartHeaderProps {
  netuid: number
  timeRange: number
}

export const FlowChartHeader: FC<FlowChartHeaderProps> = ({ netuid, timeRange }) => {
  const { totals, alphaFlow, emissionPercent, dailyEmissions, distributionTrend, isLoading } =
    useFlowHeaderData(netuid, timeRange)

  if (isLoading) return <FlowChartHeaderSkeleton />

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-2">
      {/* Left side – Net Flow Display */}
      <div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn("font-bold text-3xl", totals.net >= 0 ? "text-white" : "text-red-500")}
          >
            {totals.net >= 0 ? "+" : ""}
            {formatCompactNumber(totals.net)}τ Net
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-body-secondary">
          <span>EMA TAO flow</span>
          <span
            className={cn(
              "flex items-center gap-1 rounded px-2 py-0.5 text-xs",
              distributionTrend === "accumulating"
                ? "bg-green-500/20 text-green-500"
                : "bg-red-500/20 text-red-500"
            )}
          >
            Distribution
            <Icon
              icon={
                distributionTrend === "accumulating"
                  ? "mdi:arrow-bottom-right"
                  : "mdi:arrow-top-right"
              }
              className="size-3"
            />
          </span>
        </div>
      </div>

      {/* Right side – Stats */}
      <div className="flex flex-wrap items-start gap-6 text-sm">
        {/* TAO Flow */}
        <div className="flex flex-col">
          <span className="text-body-disabled text-xs">TAO Flow</span>
          <div className="flex flex-col">
            <span className="font-medium text-green-500">
              {formatCompactNumber(totals.taoIn)}τ{" "}
              <span className="text-body-disabled text-xs">In</span>
            </span>
            <span className="font-medium text-red-500">
              {formatCompactNumber(totals.taoOut)}τ{" "}
              <span className="text-body-disabled text-xs">Out</span>
            </span>
          </div>
        </div>

        {/* Alpha Flow */}
        <div className="flex flex-col">
          <span className="text-body-disabled text-xs">Alpha Flow</span>
          <div className="flex flex-col">
            <span className="font-medium text-green-500">
              {formatAlpha(alphaFlow.alphaIn)}{" "}
              <span className="text-body-disabled text-xs">In</span>
            </span>
            <span className="font-medium text-red-500">
              {formatAlpha(alphaFlow.alphaOut)}{" "}
              <span className="text-body-disabled text-xs">Out</span>
            </span>
          </div>
        </div>

        {/* Emissions */}
        <div className="flex flex-col items-end">
          <span className="text-body-disabled text-xs">Emissions</span>
          <span className="font-medium text-white">
            {emissionPercent !== null ? `${emissionPercent.toFixed(2)}%` : "—"}
          </span>
        </div>

        {/* Em/Day */}
        <div className="flex flex-col items-end">
          <span className="text-body-disabled text-xs">Em/Day</span>
          <span className="font-medium text-white">
            {dailyEmissions !== null ? `τ${dailyEmissions.toFixed(2)}` : "—"}
          </span>
        </div>
      </div>
    </div>
  )
}

const FlowChartHeaderSkeleton = () => (
  <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-2">
    <div className="flex flex-col gap-2">
      <div className="h-9 w-48 animate-pulse rounded bg-grey-800" />
      <div className="h-5 w-36 animate-pulse rounded bg-grey-800" />
    </div>
    <div className="flex items-start gap-6">
      <div className="flex flex-col gap-1">
        <div className="h-3 w-14 animate-pulse rounded bg-grey-800" />
        <div className="h-4 w-20 animate-pulse rounded bg-grey-800" />
        <div className="h-4 w-20 animate-pulse rounded bg-grey-800" />
      </div>
      <div className="flex flex-col gap-1">
        <div className="h-3 w-16 animate-pulse rounded bg-grey-800" />
        <div className="h-4 w-20 animate-pulse rounded bg-grey-800" />
        <div className="h-4 w-20 animate-pulse rounded bg-grey-800" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="h-3 w-16 animate-pulse rounded bg-grey-800" />
        <div className="h-4 w-14 animate-pulse rounded bg-grey-800" />
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="h-3 w-12 animate-pulse rounded bg-grey-800" />
        <div className="h-4 w-16 animate-pulse rounded bg-grey-800" />
      </div>
    </div>
  </div>
)
