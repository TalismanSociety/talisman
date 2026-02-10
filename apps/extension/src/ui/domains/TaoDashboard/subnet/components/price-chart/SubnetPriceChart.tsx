import { cn } from "@talismn/util"
import { type FC, useCallback, useMemo, useState } from "react"

import { useSubnetPrice, useSubnetStakeEvents, useSubnetTweets } from "../../../hooks/useSn45Api"
import { PriceChartGraph } from "./PriceChartGraph"
import { PriceChartHeader } from "./PriceChartHeader"
import { PriceChartToolbar } from "./PriceChartToolbar"
import { DEFAULT_INDICATORS, type IndicatorConfig, processStakeEventsToOHLC } from "./types"
import { useSubnetStats } from "./useSubnetStats"

interface SubnetPriceChartProps {
  netuid: number
  className?: string
}

export const SubnetPriceChart: FC<SubnetPriceChartProps> = ({ netuid, className }) => {
  const { data: priceData, isLoading: priceLoading } = useSubnetPrice(netuid)
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tweets } = useSubnetTweets(netuid, 50)
  const { tokenPrice, isLoading: statsLoading } = useSubnetStats(netuid)

  const [timeRange, setTimeRange] = useState(7) // days - default to 1W
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS)

  const toggleIndicator = useCallback((key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const isLoading = priceLoading || stakeLoading || statsLoading

  // Process data
  const allHourlyData = useMemo(() => {
    if (!stakeEvents || !priceData) return []
    return processStakeEventsToOHLC(stakeEvents, priceData)
  }, [stakeEvents, priceData])

  // Filter by time range
  const hourlyData = useMemo(() => {
    if (timeRange === 0) return allHourlyData
    const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000
    return allHourlyData.filter((d) => d.hour.getTime() >= cutoff)
  }, [allHourlyData, timeRange])

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="h-16 w-48 animate-pulse rounded bg-grey-800" />
            <div className="h-8 w-64 animate-pulse rounded bg-grey-800" />
          </div>
          <div className="mt-4 flex h-[400px] items-center justify-center">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-grey-700" />
          </div>
        </div>
      </div>
    )
  }

  if (hourlyData.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="rounded-lg bg-[#0d0d0d] p-6">
          <PriceChartHeader netuid={netuid} />
          <div className="mt-4 flex h-[400px] items-center justify-center text-body-secondary">
            No data available for this subnet.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="rounded-lg">
        <PriceChartHeader netuid={netuid} />
        <PriceChartToolbar
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          indicators={indicators}
          toggleIndicator={toggleIndicator}
        />
        <PriceChartGraph
          hourlyData={hourlyData}
          priceData={priceData ?? []}
          tweets={tweets ?? undefined}
          tokenPrice={tokenPrice}
          indicators={indicators}
        />
      </div>
    </div>
  )
}
