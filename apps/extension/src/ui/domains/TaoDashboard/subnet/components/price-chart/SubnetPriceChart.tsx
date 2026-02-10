import { cn } from "@talismn/util"
import { type FC, useCallback, useState } from "react"

import { PriceChartGraph } from "./PriceChartGraph"
import { PriceChartHeader } from "./PriceChartHeader"
import { PriceChartToolbar } from "./PriceChartToolbar"
import { DEFAULT_INDICATORS, type IndicatorConfig } from "./types"

interface SubnetPriceChartProps {
  netuid: number
  className?: string
}

export const SubnetPriceChart: FC<SubnetPriceChartProps> = ({ netuid, className }) => {
  const [timeRange, setTimeRange] = useState(7) // days - default to 1W
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS)

  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <PriceChartHeader netuid={netuid} />
      <div className="h-px shrink-0 bg-grey-800"></div>
      <PriceChartToolbar
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        indicators={indicators}
        toggleIndicator={toggleIndicator}
      />
      <PriceChartGraph netuid={netuid} timeRange={timeRange} indicators={indicators} />
    </div>
  )
}
