import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useState } from "react"

import { FlowChartGraph } from "./FlowChartGraph"
import { FlowChartHeader } from "./FlowChartHeader"

interface SubnetTaoFlowChartProps {
  netuid: number
  className?: string
}

export const SubnetTaoFlowChart: FC<SubnetTaoFlowChartProps> = ({ netuid, className }) => {
  const [period, setPeriod] = useState<TimePeriod>("1w")

  return (
    <div className={cn("flex size-full flex-col", className)}>
      <FlowChartHeader netuid={netuid} period={period} />
      <div className="h-px shrink-0 bg-grey-800"></div>
      <div className="w-full grow overflow-hidden">
        <FlowChartGraph netuid={netuid} period={period} onPeriodChanged={setPeriod} />
      </div>
    </div>
  )
}
