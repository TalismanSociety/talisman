import { cn } from "@talismn/util"
import type { FC } from "react"
import { useState } from "react"

import { FlowChartGraph } from "./FlowChartGraph"
import { FlowChartHeader } from "./FlowChartHeader"
import { FlowChartToolbar } from "./FlowChartToolbar"
import { useFlowChartData } from "./useFlowChartData"

interface SubnetTaoFlowChartProps {
  netuid: number
  className?: string
}

export const SubnetTaoFlowChart: FC<SubnetTaoFlowChartProps> = ({ netuid, className }) => {
  const [timeRange, setTimeRange] = useState(7) // default 1W

  const {
    flowData,
    totals,
    alphaFlow,
    emissionPercent,
    dailyEmissions,
    distributionTrend,
    isLoading,
  } = useFlowChartData(netuid, timeRange)

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="h-16 w-48 animate-pulse rounded bg-grey-800" />
            <div className="h-8 w-64 animate-pulse rounded bg-grey-800" />
          </div>
          <div className="mt-4 flex h-[350px] items-center justify-center">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
          </div>
        </div>
      </div>
    )
  }

  if (flowData.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-3xl text-white">0τ Net</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-body-secondary">
                <span>EMA TAO flow</span>
                <span className="rounded bg-grey-800 px-2 py-0.5 text-xs">Distribution</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex h-[350px] items-center justify-center text-body-secondary">
            No flow data available for this subnet.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="rounded-lg bg-[#0d0d0d]">
        <FlowChartHeader
          totals={totals}
          alphaFlow={alphaFlow}
          emissionPercent={emissionPercent}
          dailyEmissions={dailyEmissions}
          distributionTrend={distributionTrend}
        />
        <FlowChartToolbar timeRange={timeRange} onTimeRangeChange={setTimeRange} />
        <FlowChartGraph flowData={flowData} />
      </div>
    </div>
  )
}
