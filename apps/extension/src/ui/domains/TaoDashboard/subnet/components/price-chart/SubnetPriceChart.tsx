import { cn } from "@talismn/util"
import type { FC } from "react"

import { PriceChartGraph } from "./PriceChartGraph"
import { PriceChartHeader } from "./PriceChartHeader"

export const SubnetPriceChart: FC<{
  netuid: number
  className?: string
}> = ({ netuid, className }) => (
  <div className={cn("flex size-full flex-col", className)}>
    <PriceChartHeader netuid={netuid} />
    <div className="h-px shrink-0 bg-grey-800"></div>
    <div className="w-full grow overflow-hidden">
      <PriceChartGraph netuid={netuid} />
    </div>
  </div>
)
