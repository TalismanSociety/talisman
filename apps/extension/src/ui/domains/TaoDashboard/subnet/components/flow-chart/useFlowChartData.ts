import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useMemo } from "react"

import { useSubnetStakeEvents, useSubnetTokenomics } from "../../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"
import type { AlphaFlow, FlowTotals, ProcessedFlowData } from "./types"

// ---------------------------------------------------------------------------
// Shared data processing
// ---------------------------------------------------------------------------

function processStakeEventsToFlow(
  stakeEvents: Array<{
    method: "Adding" | "Removing"
    alphaAmount: string
    taoAmount: string
    timestamp: string
  }>
): ProcessedFlowData[] {
  if (stakeEvents.length === 0) return []

  const processedStakes = stakeEvents.map((e) => ({
    ...e,
    timestamp: new Date(e.timestamp),
    alpha: parseFloat(e.alphaAmount) / 1e9,
    tao: parseFloat(e.taoAmount) / 1e9,
  }))

  processedStakes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  // Group by hour
  const hourlyMap = new Map<string, { time: Date; taoIn: number; taoOut: number }>()

  for (const stake of processedStakes) {
    const hour = new Date(Math.floor(stake.timestamp.getTime() / 3600000) * 3600000)
    const hourKey = hour.toISOString()

    if (!hourlyMap.has(hourKey)) {
      hourlyMap.set(hourKey, { time: hour, taoIn: 0, taoOut: 0 })
    }

    const entry = hourlyMap.get(hourKey)!
    if (stake.method === "Adding") {
      entry.taoIn += stake.tao
    } else {
      entry.taoOut += stake.tao
    }
  }

  // Sort by time and build cumulative sums
  const hourlyEntries = Array.from(hourlyMap.values()).sort(
    (a, b) => a.time.getTime() - b.time.getTime()
  )

  let cumulativeTaoIn = 0
  let cumulativeTaoOut = 0

  return hourlyEntries.map((entry) => {
    cumulativeTaoIn += entry.taoIn
    cumulativeTaoOut += entry.taoOut
    return {
      time: entry.time,
      taoIn: entry.taoIn,
      taoOut: entry.taoOut,
      cumulativeTaoIn,
      cumulativeTaoOut,
      net: cumulativeTaoIn - cumulativeTaoOut,
    }
  })
}

/** Filter processed flow data by a time range (in days). 0 = all. */
function filterByTimeRange(data: ProcessedFlowData[], timeRange: number): ProcessedFlowData[] {
  if (timeRange === 0) return data
  const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000
  return data.filter((d) => d.time.getTime() >= cutoff)
}

// ---------------------------------------------------------------------------
// Hook – Header data (totals, alpha flow, emissions)
// ---------------------------------------------------------------------------

export interface UseFlowHeaderDataReturn {
  totals: FlowTotals
  alphaFlow: AlphaFlow
  emissionPercent: number | null
  dailyEmissions: number | null
  distributionTrend: "accumulating" | "distributing"
  isLoading: boolean
}

export function useFlowHeaderData(netuid: number, timeRange: number): UseFlowHeaderDataReturn {
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const isLoading = stakeLoading || tokenomicsLoading

  // Current subnet entry
  const currentSubnet = useMemo(
    () => subnetData.find((s) => Number(s.netuid) === netuid),
    [subnetData, netuid]
  )

  // Process & filter flow data to compute totals
  const flowData = useMemo(() => {
    if (!stakeEvents) return []
    return filterByTimeRange(processStakeEventsToFlow(stakeEvents), timeRange)
  }, [stakeEvents, timeRange])

  // Totals for the visible window
  const totals = useMemo<FlowTotals>(() => {
    if (flowData.length === 0) return { taoIn: 0, taoOut: 0, net: 0 }
    const taoIn = flowData.reduce((sum, d) => sum + d.taoIn, 0)
    const taoOut = flowData.reduce((sum, d) => sum + d.taoOut, 0)
    return { taoIn, taoOut, net: taoIn - taoOut }
  }, [flowData])

  // Alpha flow from tokenomics
  const alphaFlow = useMemo<AlphaFlow>(() => {
    if (!tokenomics) return { alphaIn: 0, alphaOut: 0 }
    return {
      alphaIn: parseFloat(tokenomics.alphaIn) / 1e9,
      alphaOut: parseFloat(tokenomics.alphaOut) / 1e9,
    }
  }, [tokenomics])

  // Emissions
  const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null

  const emissionPercent = emissionRaw ? (Number(emissionRaw) / 1e9 / 1e9) * 100 : null

  const dailyEmissions = emissionRaw
    ? (Number(emissionRaw) / 1e9) * (7200 / (currentSubnet?.tempo || 360))
    : null

  // Trend direction
  const distributionTrend: "accumulating" | "distributing" =
    totals.net >= 0 ? "accumulating" : "distributing"

  return { totals, alphaFlow, emissionPercent, dailyEmissions, distributionTrend, isLoading }
}

// ---------------------------------------------------------------------------
// Hook – Graph data (flow time-series)
// ---------------------------------------------------------------------------

export interface UseFlowGraphDataReturn {
  flowData: ProcessedFlowData[]
  isLoading: boolean
}

export function useFlowGraphData(netuid: number, timeRange: number): UseFlowGraphDataReturn {
  const { data: stakeEvents, isLoading } = useSubnetStakeEvents(netuid)

  const flowData = useMemo(() => {
    if (!stakeEvents) return []
    return filterByTimeRange(processStakeEventsToFlow(stakeEvents), timeRange)
  }, [stakeEvents, timeRange])

  return { flowData, isLoading }
}
