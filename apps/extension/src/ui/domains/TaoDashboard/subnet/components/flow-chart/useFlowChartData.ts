import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import type { UTCTimestamp } from "lightweight-charts"
import { useMemo } from "react"

import { useSubnetFlowChart, useSubnetFlowSummary } from "../../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"
import type { AlphaFlow, FlowChartPoint, FlowTotals } from "./types"

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
  const { data: flowSummary, isLoading: summaryLoading } = useSubnetFlowSummary(netuid, timeRange)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  // Current subnet entry
  const currentSubnet = useMemo(
    () => subnetData.find((s) => Number(s.netuid) === netuid),
    [subnetData, netuid]
  )

  // TAO flow totals from the flow-summary endpoint (rao strings → float TAO)
  const totals = useMemo<FlowTotals>(() => {
    if (!flowSummary) return { taoIn: 0, taoOut: 0, net: 0 }
    return {
      taoIn: Number(flowSummary.taoFlow.taoIn) / 1e9,
      taoOut: Number(flowSummary.taoFlow.taoOut) / 1e9,
      net: Number(flowSummary.taoFlow.net) / 1e9,
    }
  }, [flowSummary])

  // Alpha flow from the flow-summary endpoint (rao strings → float alpha)
  const alphaFlow = useMemo<AlphaFlow>(() => {
    if (!flowSummary) return { alphaIn: 0, alphaOut: 0 }
    return {
      alphaIn: Number(flowSummary.alphaFlow.alphaIn) / 1e9,
      alphaOut: Number(flowSummary.alphaFlow.alphaOut) / 1e9,
    }
  }, [flowSummary])

  // Emissions (from on-chain subnet data)
  const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null

  const emissionPercent = emissionRaw ? (Number(emissionRaw) / 1e9 / 1e9) * 100 : null

  const dailyEmissions = emissionRaw
    ? (Number(emissionRaw) / 1e9) * (7200 / (currentSubnet?.tempo || 360))
    : null

  // Trend direction
  const distributionTrend: "accumulating" | "distributing" =
    totals.net >= 0 ? "accumulating" : "distributing"

  return {
    totals,
    alphaFlow,
    emissionPercent,
    dailyEmissions,
    distributionTrend,
    isLoading: summaryLoading,
  }
}

// ---------------------------------------------------------------------------
// Hook – Graph data (flow time-series from flow-chart endpoint)
// ---------------------------------------------------------------------------

export interface UseFlowGraphDataReturn {
  taoInData: FlowChartPoint[]
  taoOutData: FlowChartPoint[]
  netData: FlowChartPoint[]
  isLoading: boolean
}

export function useFlowGraphData(netuid: number, timeRange: number): UseFlowGraphDataReturn {
  const { data: flowChart, isLoading } = useSubnetFlowChart(netuid, timeRange)

  const { taoInData, taoOutData, netData } = useMemo(() => {
    if (!flowChart?.data?.length)
      return {
        taoInData: [] as FlowChartPoint[],
        taoOutData: [] as FlowChartPoint[],
        netData: [] as FlowChartPoint[],
      }

    const taoIn: FlowChartPoint[] = []
    const taoOut: FlowChartPoint[] = []
    const net: FlowChartPoint[] = []

    for (const [time, cumulativeTaoIn, cumulativeTaoOut, netValue] of flowChart.data) {
      const t = time as UTCTimestamp
      taoIn.push({ time: t, value: cumulativeTaoIn as number })
      taoOut.push({ time: t, value: cumulativeTaoOut as number })
      net.push({ time: t, value: netValue as number })
    }

    return { taoInData: taoIn, taoOutData: taoOut, netData: net }
  }, [flowChart])

  return { taoInData, taoOutData, netData, isLoading }
}
