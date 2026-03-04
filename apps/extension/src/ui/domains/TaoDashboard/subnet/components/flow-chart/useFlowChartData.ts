import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/types"
import type { UTCTimestamp } from "lightweight-charts"
import { useMemo } from "react"

import { useSubnetTaoFlow } from "../../../hooks/useSn45Api"
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
  const { data: taoFlow, isLoading } = useSubnetTaoFlow(netuid, period)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  // Current subnet entry
  const currentSubnet = useMemo(
    () => subnetData.find((s) => Number(s.netuid) === netuid),
    [subnetData, netuid]
  )

  // TAO flow totals (already float TAO from the tao-flow endpoint)
  const totals = useMemo<FlowTotals>(() => {
    if (!taoFlow) return { taoIn: 0, taoOut: 0, net: 0 }
    return {
      taoIn: taoFlow.totals.taoIn,
      taoOut: taoFlow.totals.taoOut,
      net: taoFlow.totals.taoIn - taoFlow.totals.taoOut,
    }
  }, [taoFlow])

  // Alpha flow (already float ALPHA from the tao-flow endpoint)
  const alphaFlow = useMemo<AlphaFlow>(() => {
    if (!taoFlow) return { alphaIn: 0, alphaOut: 0 }
    return {
      alphaIn: taoFlow.totals.alphaIn,
      alphaOut: taoFlow.totals.alphaOut,
    }
  }, [taoFlow])

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
    isLoading,
  }
}

// ---------------------------------------------------------------------------
// Hook – Graph data (flow time-series from tao-flow endpoint)
// ---------------------------------------------------------------------------

export interface UseFlowGraphDataReturn {
  taoInData: FlowChartPoint[]
  taoOutData: FlowChartPoint[]
  netData: FlowChartPoint[]
  isLoading: boolean
}

export function useFlowGraphData(netuid: number, period: TimePeriod): UseFlowGraphDataReturn {
  const { data: taoFlow, isLoading } = useSubnetTaoFlow(netuid, period)

  const { taoInData, taoOutData, netData } = useMemo(() => {
    if (!taoFlow?.series?.length)
      return {
        taoInData: [] as FlowChartPoint[],
        taoOutData: [] as FlowChartPoint[],
        netData: [] as FlowChartPoint[],
      }

    const taoIn: FlowChartPoint[] = []
    const taoOut: FlowChartPoint[] = []
    const net: FlowChartPoint[] = []

    for (const [time, cumulativeTaoIn, cumulativeTaoOut, netValue] of taoFlow.series) {
      const t = time as UTCTimestamp
      taoIn.push({ time: t, value: cumulativeTaoIn as number })
      taoOut.push({ time: t, value: cumulativeTaoOut as number })
      net.push({ time: t, value: netValue as number })
    }

    return { taoInData: taoIn, taoOutData: taoOut, netData: net }
  }, [taoFlow])

  return { taoInData, taoOutData, netData, isLoading }
}
