import { useQuery } from "@tanstack/react-query"
import { getSn45Api } from "extension-core"
import { useMemo } from "react"

// Create a singleton API instance
const sn45Api = getSn45Api()

export type SubnetLeaderboardResponse = Awaited<
  ReturnType<typeof sn45Api.v1.getSubnetLeaderboard>
>["data"]

export type SubnetLeaderboardRow = Omit<
  SubnetLeaderboardResponse["subnets"][number],
  "priceHistory7d"
> & {
  priceHistory7d: number[] | null
}

// Hook to get the TAO price
export const useTaoPrice = () => {
  return useQuery({
    queryKey: ["sn45", "taoPrice"],
    queryFn: async () => {
      const response = await sn45Api.v1.getTaoPrice()
      return response.data
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet leaderboard data
export const useSubnetLeaderboard = (period: "1d" | "1w" | "1m" = "1d") => {
  return useQuery({
    queryKey: ["sn45", "subnetLeaderboard", period],
    queryFn: async (): Promise<
      Omit<SubnetLeaderboardResponse, "subnets"> & { subnets: SubnetLeaderboardRow[] }
    > => {
      const response = await sn45Api.v1.getSubnetLeaderboard({ period })
      const data = response.data

      return {
        ...data,
        subnets: data.subnets.map((subnet) => ({
          ...subnet,
          priceHistory7d: Array.isArray(subnet.priceHistory7d)
            ? subnet.priceHistory7d
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value))
            : null,
        })),
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export const useSubnetLeaderboardEntry = (
  netuid: number | null | undefined,
  period: "1d" | "1w" | "1m" = "1d"
) => {
  const query = useSubnetLeaderboard(period)

  const data = useMemo(() => {
    if (!query.data) return null
    return query.data.subnets.find((subnet) => subnet.netuid === netuid) ?? null
  }, [query.data, netuid])

  return { ...query, data }
}

// Hook to get subnet price history
export const useSubnetPrice = (netuid: number | null | undefined) => {
  return useQuery({
    queryKey: ["sn45", "subnetPrice", netuid],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetPrice(String(netuid))
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet tokenomics
export const useSubnetTokenomics = (netuid: number | null | undefined) => {
  return useQuery({
    queryKey: ["sn45", "subnetTokenomics", netuid],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTokenomics(String(netuid))
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet stake events
export const useSubnetStakeEvents = (netuid: number | null | undefined) => {
  return useQuery({
    queryKey: ["sn45", "subnetStakeEvents", netuid],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetStakeEvents(String(netuid))
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet trade flow metrics
export const useSubnetTradeFlow = (
  netuid: number | null | undefined,
  period: "1d" | "1w" | "1m" = "1d"
) => {
  return useQuery({
    queryKey: ["sn45", "subnetTradeFlow", netuid, period],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTradeFlow(String(netuid), { period })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet flow summary (pre-computed header data)
export const useSubnetFlowSummary = (netuid: number | null | undefined, days: number) => {
  return useQuery({
    queryKey: ["sn45", "subnetFlowSummary", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetFlowSummary(String(netuid), {
        days: String(days),
      })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet flow chart time-series (pre-bucketed for TradingView)
export const useSubnetFlowChart = (netuid: number | null | undefined, days: number) => {
  return useQuery({
    queryKey: ["sn45", "subnetFlowChart", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetFlowChart(String(netuid), {
        days: String(days),
      })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet positions
export const useSubnetPositions = (netuid: number | null | undefined) => {
  return useQuery({
    queryKey: ["sn45", "subnetPositions", netuid],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetPositions(String(netuid))
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 120_000,
    staleTime: 120_000,
  })
}

// Hook to get subnet holder metrics
export const useSubnetHolders = (netuid: number | null | undefined, days = 30) => {
  return useQuery({
    queryKey: ["sn45", "subnetHolders", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetHolders(String(netuid), {
        days,
      })
      return response.data ?? null
    },
    enabled: !!netuid,
    refetchInterval: 300_000, // 5 minutes
    staleTime: 300_000,
  })
}

export type WhaleTransactionType =
  | "StakeAdded"
  | "StakeRemoved"
  | "StakeMove"
  | "StakeTransfer"
  | "StakeSwapped"

export interface WhaleTransaction {
  id: string
  blockHeight: number
  extrinsicIndex: number | null
  transactionType: WhaleTransactionType
  tier: "Shrimp" | "Crab" | "Fish" | "Dolphin" | "Shark" | "Whale"
  coldkey: string
  hotkey: string
  netuid: number
  originNetuid: number | null
  taoAmount: string
  alphaAmount: string | null
  destinationColdkey: string | null
  timestamp: string
}

export const useSubnetSentiment = (netuid: number | null | undefined, days?: number) => {
  return useQuery({
    queryKey: ["sn45", "subnetSentiment", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetSentiment(String(netuid), { days })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
}

// Hook to get subnet tweets
export const useSubnetTweets = (netuid: number | null | undefined, days: number) => {
  return useQuery({
    queryKey: ["sn45", "subnetTweets", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTweets(String(netuid), { days })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export const useSubnetWhalesFlow = (netuid: number | null | undefined, days?: number) => {
  return useQuery({
    queryKey: ["sn45", "subnetWhalesFlow", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetWhalesFlow(String(netuid), { days })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export const useSubnetWhalesActivity = (netuid: number | null | undefined, days?: number) => {
  return useQuery({
    queryKey: ["sn45", "subnetWhalesActivity", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetWhalesActivity(String(netuid), { days })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
