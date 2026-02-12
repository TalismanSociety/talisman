import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useMemo } from "react"

import { useSubnetStakeEvents, useSubnetTokenomics } from "../../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"
import type { AlphaFlow, FlowTotals, ProcessedFlowData } from "./types"

// ---------------------------------------------------------------------------
// Data processing
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseFlowChartDataReturn {
  flowData: ProcessedFlowData[]
  totals: FlowTotals
  alphaFlow: AlphaFlow
  emissionPercent: number | null
  dailyEmissions: number | null
  distributionTrend: "accumulating" | "distributing"
  isLoading: boolean
}

export function useFlowChartData(netuid: number, timeRange: number): UseFlowChartDataReturn {
  const { data: stakeEvents, isLoading: stakeLoading } = useSubnetStakeEvents(netuid)
  const { data: tokenomics } = useSubnetTokenomics(netuid)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const isLoading = stakeLoading

  // Current subnet entry
  const currentSubnet = useMemo(
    () => subnetData.find((s) => Number(s.netuid) === netuid),
    [subnetData, netuid]
  )

  // Process all flow data
  const allFlowData = useMemo(() => {
    if (!stakeEvents) return []
    return processStakeEventsToFlow(stakeEvents)
  }, [stakeEvents])

  // Filter by selected time range
  const flowData = useMemo(() => {
    if (timeRange === 0) return allFlowData
    const cutoff = Date.now() - timeRange * 24 * 60 * 60 * 1000
    return allFlowData.filter((d) => d.time.getTime() >= cutoff)
  }, [allFlowData, timeRange])

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

  return {
    flowData,
    totals,
    alphaFlow,
    emissionPercent,
    dailyEmissions,
    distributionTrend,
    isLoading,
  }
}
