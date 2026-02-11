import { cn } from "@talismn/util"
import { type FC, useCallback, useState } from "react"

import { PriceChartGraph } from "./PriceChartGraph"
import { PriceChartHeader } from "./PriceChartHeader"
// import { PriceChartToolbar } from "./PriceChartToolbar"
import { DEFAULT_INDICATORS, type IndicatorConfig } from "./types"

interface SubnetPriceChartProps {
  netuid: number
  className?: string
}

export const SubnetPriceChart: FC<SubnetPriceChartProps> = ({ netuid, className }) => {
  const [timeRange, _setTimeRange] = useState(7) // days - default to 1W
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS)

  const _toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <div className={cn("flex size-full flex-col", className)}>
      <PriceChartHeader netuid={netuid} />
      <div className="h-px shrink-0"></div>
      <div className="w-full grow overflow-hidden">
        <PriceChartGraph netuid={netuid} timeRange={timeRange} indicators={indicators} />
      </div>
    </div>
  )
}
