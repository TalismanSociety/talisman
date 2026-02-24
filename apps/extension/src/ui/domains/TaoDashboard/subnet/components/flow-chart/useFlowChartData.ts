import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import type { UTCTimestamp } from "lightweight-charts"
import { useMemo } from "react"

import { useSubnetFlowChart, useSubnetFlowSummary } from "../../../hooks/useSn45Api"
import { raoToTao } from "../../../shared/util"
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

export function useFlowHeaderData(netuid: number, period: TimePeriod): UseFlowHeaderDataReturn {
  const { data: flowSummary, isLoading: summaryLoading } = useSubnetFlowSummary(netuid, period)
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
      taoIn: raoToTao(flowSummary.taoFlow.taoIn),
      taoOut: raoToTao(flowSummary.taoFlow.taoOut),
      net: raoToTao(flowSummary.taoFlow.net),
    }
  }, [flowSummary])

  // Alpha flow from the flow-summary endpoint (rao strings → float alpha)
  const alphaFlow = useMemo<AlphaFlow>(() => {
    if (!flowSummary) return { alphaIn: 0, alphaOut: 0 }
    return {
      alphaIn: raoToTao(flowSummary.alphaFlow.alphaIn),
      alphaOut: raoToTao(flowSummary.alphaFlow.alphaOut),
    }
  }, [flowSummary])

  // Emissions (from on-chain subnet data)
  const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null

  const emissionPercent = emissionRaw ? raoToTao(emissionRaw) * 100 : null

  const dailyEmissions = emissionRaw
    ? raoToTao(emissionRaw) * (7200 / (currentSubnet?.tempo ?? 360))
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

export function useFlowGraphData(netuid: number, period: TimePeriod): UseFlowGraphDataReturn {
  const { data: flowChart, isLoading } = useSubnetFlowChart(netuid, period)

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
