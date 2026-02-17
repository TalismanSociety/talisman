import { useQuery } from "@tanstack/react-query"
import { Sn45Api } from "extension-core"
import { SN45_API_BASE_URL } from "extension-shared"
import { useMemo } from "react"

// Create a singleton API instance
const sn45Api = new Sn45Api({ baseUrl: SN45_API_BASE_URL })

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

// Hook to get subnet economics list (for table data)
export const useSubnetEconomics = () => {
  return useQuery({
    queryKey: ["sn45", "subnetEconomics"],
    queryFn: async () => {
      const response = await sn45Api.v1.getSubnetEconomicsList()
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

// Hook to get sentiment summary
export const useSentimentSummary = () => {
  return useQuery({
    queryKey: ["sn45", "sentimentSummary"],
    queryFn: async () => {
      const response = await sn45Api.v1.getSentimentSummary()
      return response.data
    },
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
}

// Hook to get sentiment by subnet
export const useSubnetSentimentList = () => {
  return useQuery({
    queryKey: ["sn45", "subnetSentimentList"],
    queryFn: async () => {
      const response = await sn45Api.v1.getSubnetSentimentList()
      return response.data
    },
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
}

// Hook to get whale movements
export const useWhaleMovements = (minTao = 50, limit = 20) => {
  return useQuery({
    queryKey: ["sn45", "whaleMovements", minTao, limit],
    queryFn: async () => {
      const response = await sn45Api.v1.getWhaleMovements({
        minTao: String(minTao),
        limit: String(limit),
      })
      return response.data
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
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

// Hook to get subnet holder history (for holder distribution charts)
export const useSubnetHolderHistory = (netuid: number | null | undefined, days = 30) => {
  return useQuery({
    queryKey: ["sn45", "subnetHolderHistory", netuid, days],
    queryFn: async () => {
      if (!netuid) return []
      try {
        const response = await sn45Api.v1.getSubnetHolderHistory(String(netuid), {
          days: String(days),
        })
        return response.data ?? []
      } catch {
        return []
      }
    },
    enabled: !!netuid,
    refetchInterval: 300_000, // 5 minutes
    staleTime: 300_000,
  })
}

// Hook to get subnet holder metrics
export const useSubnetHolders = (netuid: number | null | undefined, days = 30) => {
  return useQuery({
    queryKey: ["sn45", "subnetHolders", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      try {
        const response = await sn45Api.v1.getSubnetHolders(String(netuid), {
          days,
        })
        return response.data ?? null
      } catch {
        return null
      }
    },
    enabled: !!netuid,
    refetchInterval: 300_000, // 5 minutes
    staleTime: 300_000,
  })
}

// Whale transaction types matching the GraphQL schema
export type WhaleTransactionType =
  | "StakeAdded"
  | "StakeRemoved"
  | "StakeMove"
  | "StakeTransfer"
  | "StakeSwapped"

export type WhaleTier = "Shrimp" | "Crab" | "Fish" | "Dolphin" | "Shark" | "Whale"

export interface WhaleTransaction {
  id: string
  blockHeight: number
  extrinsicIndex: number | null
  transactionType: WhaleTransactionType
  tier: WhaleTier
  coldkey: string
  hotkey: string
  netuid: number
  originNetuid: number | null
  taoAmount: string // BigInt as string (in rao)
  alphaAmount: string | null // BigInt as string (in rao)
  destinationColdkey: string | null
  timestamp: string
}

// Type for the new DailyHolderDistribution GraphQL model
export interface DailyHolderDistribution {
  id: string
  netuid: number
  snapshotDate: string
  holdersUnder100: number // < 100 alpha
  holders100To1k: number // >= 100 and < 1,000 alpha
  holders1kTo10k: number // >= 1,000 and < 10,000 alpha
  holders10kTo100k: number // >= 10,000 and < 100,000 alpha
  holders100kTo1m: number // >= 100,000 and < 1,000,000 alpha
  holders1mPlus: number // >= 1,000,000 alpha
  totalHolders: number
  totalAlpha: string // BigInt as string
  blockHeight: number
  timestamp: string
}

// Hook to get holder distribution from the new GraphQL-backed endpoint
export const useHolderDistribution = (netuid: number | null | undefined, days = 30) => {
  return useQuery({
    queryKey: ["sn45", "holderDistribution", netuid, days],
    queryFn: async (): Promise<DailyHolderDistribution[]> => {
      if (!netuid) return []
      try {
        const response = await sn45Api.v1.getSubnetHolderDistribution(String(netuid), {
          days: String(days),
        })
        return response.data ?? []
      } catch {
        return []
      }
    },
    enabled: !!netuid,
    refetchInterval: 300_000, // 5 minutes
    staleTime: 300_000,
  })
}

// Hook to get subnet events (for chart markers)
export const useSubnetEvents = (netuid: number | null | undefined, limit = 250) => {
  return useQuery({
    queryKey: ["sn45", "subnetEvents", netuid, limit],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetEvents(String(netuid), { limit: String(limit) })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
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

export const useSubnetCombinedScore = (netuid: number | null | undefined, days?: number) => {
  return useQuery({
    queryKey: ["sn45", "subnetCombinedScore", netuid, days],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetCombinedScore(String(netuid), { days })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get all whale transactions (not subnet specific)
export const useAllWhaleTransactions = (options?: {
  limit?: number
  tier?: WhaleTier
  transactionType?: WhaleTransactionType
  minTaoAmount?: number
  netuid?: number
}) => {
  const limit = options?.limit ?? 50
  const tier = options?.tier
  const transactionType = options?.transactionType
  const minTaoAmount = options?.minTaoAmount
  const netuid = options?.netuid

  return useQuery({
    queryKey: ["sn45", "allWhaleTransactions", limit, tier, transactionType, minTaoAmount, netuid],
    queryFn: async (): Promise<WhaleTransaction[]> => {
      try {
        const response = await sn45Api.v1.getWhaleTransactions({
          limit: String(limit),
          tier,
          transactionType,
          minTaoAmount: minTaoAmount !== undefined ? String(minTaoAmount) : undefined,
          netuid: netuid !== undefined ? String(netuid) : undefined,
        })
        // Convert hex addresses to SS58
        return response.data
      } catch {
        return []
      }
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Combined hook for subnet economics with sentiment data
export const useSubnetEconomicsWithSentiment = () => {
  const {
    data: economics,
    isLoading: economicsLoading,
    isError: isEconomicsError,
  } = useSubnetEconomics()
  const {
    data: sentimentList,
    isLoading: sentimentLoading,
    isError: isSentimentError,
  } = useSubnetSentimentList()
  const { data: taoPrice, isError: isTaoPriceError } = useTaoPrice()

  const data = useMemo(() => {
    if (!economics) return []

    const sentimentMap = new Map((sentimentList ?? []).map((s) => [s.subnetId, s]))

    return economics.map((econ) => {
      const sentiment = sentimentMap.get(econ.netuid)
      const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0
      const priceUsd = econ.price * taoUsdPrice

      return {
        netuid: econ.netuid,
        price: econ.price,
        priceUsd,
        volume: econ.volume,
        alphaIn: econ.alphaIn,
        alphaOut: econ.alphaOut,
        netAlpha: econ.netAlpha,
        emaTaoFlow: econ.emaTaoFlow,
        economicScore: econ.economicScore,
        flowDirection: econ.flowDirection,
        sentimentScore: sentiment?.sentimentScore ?? 0,
        sentimentTotal: sentiment?.total ?? 0,
      }
    })
  }, [economics, sentimentList, taoPrice])

  return {
    data,
    isLoading: economicsLoading || sentimentLoading,
    isError: isEconomicsError || isSentimentError || isTaoPriceError,
  }
}

// Hook to get sentiment for a single subnet (avoids fetching all subnet economics)
export const useSingleSubnetSentiment = (netuid: number | null | undefined) => {
  const { data: sentimentList, isLoading } = useSubnetSentimentList()

  const sentiment = useMemo(() => {
    if (!sentimentList || !netuid) return null
    return sentimentList.find((s) => s.subnetId === netuid) ?? null
  }, [sentimentList, netuid])

  return {
    data: sentiment,
    isLoading,
  }
}
