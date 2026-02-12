import { cn } from "@talismn/util"
import type { FC } from "react"
import { useState } from "react"

import { FlowChartGraph } from "./FlowChartGraph"
import { FlowChartHeader } from "./FlowChartHeader"

interface SubnetTaoFlowChartProps {
  netuid: number
  className?: string
}

export const SubnetTaoFlowChart: FC<SubnetTaoFlowChartProps> = ({ netuid, className }) => {
  const [timeRange, _setTimeRange] = useState(7) // default 1W

  return (
    <div className={cn("flex size-full flex-col", className)}>
      <FlowChartHeader netuid={netuid} timeRange={timeRange} />
      <div className="h-px shrink-0 bg-grey-800"></div>
      <div className="w-full grow overflow-hidden">
        <FlowChartGraph netuid={netuid} timeRange={timeRange} />
      </div>
      {/* <FlowChartToolbar timeRange={timeRange} onTimeRangeChange={setTimeRange} /> */}
    </div>
  )
}
