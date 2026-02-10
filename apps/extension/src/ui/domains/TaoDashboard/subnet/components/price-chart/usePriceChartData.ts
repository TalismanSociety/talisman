import { useMemo } from "react"

import { useSubnetPrice, useSubnetStakeEvents, useSubnetTweets } from "../../../hooks/useSn45Api"
import { processStakeEventsToOHLC } from "./types"

/**
 * Hook to fetch and process price chart data for a subnet.
 * Returns OHLC data, raw price data, tweets, and loading state.
 */
export function usePriceChartData(netuid: number, timeRange: number) {
  const { data: priceData, isLoading: priceLoading } = useSubnetPrice(netuid)
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tweets } = useSubnetTweets(netuid, 50)

  const isLoading = priceLoading || stakeLoading

  // Process stake events into OHLC data
  const allHourlyData = useMemo(() => {
    if (!stakeEvents || !priceData) return []
    return processStakeEventsToOHLC(stakeEvents, priceData)
  }, [stakeEvents, priceData])

  // Filter by selected time range
  const hourlyData = useMemo(() => {
    if (timeRange === 0) return allHourlyData
    const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000
    return allHourlyData.filter((d) => d.hour.getTime() >= cutoff)
  }, [allHourlyData, timeRange])

  return {
    hourlyData,
    priceData: priceData ?? [],
    tweets: tweets ?? undefined,
    isLoading,
  }
}
