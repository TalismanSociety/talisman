import { hexToU8a, isHex } from "@polkadot/util"
import { encodeAddressSs58 } from "@talismn/crypto"
import { useQuery } from "@tanstack/react-query"
import { Sn45Api } from "extension-core"
import { useMemo } from "react"

// Convert hex public key to SS58 address with prefix 42 (Polkadot generic)
const hexToSs58 = (hex: string | null | undefined): string | null | undefined => {
  if (!hex) return hex
  if (!isHex(hex)) return hex // Already SS58 or other format
  try {
    const publicKey = hexToU8a(hex)
    return encodeAddressSs58(publicKey, 42)
  } catch {
    return hex // Return original if conversion fails
  }
}

// @dev: turn this flag on temporarily when debugging the api locally
const LOCAL_DEV = false

const SN45_API_BASE_URL =
  process.env.NODE_ENV === "development" && LOCAL_DEV
    ? "http://localhost:8787"
    : "https://sn45api.talisman.xyz"

// Create a singleton API instance
const sn45Api = new Sn45Api({ baseUrl: SN45_API_BASE_URL })

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
      return response.data.map((item) => ({
        ...item,
        coldkey: hexToSs58(item.coldkey) ?? item.coldkey,
      }))
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
      return response.data.map((item) => ({
        ...item,
        coldkey: hexToSs58(item.coldkey) ?? item.coldkey,
      }))
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
      return response.data.map((item) => ({
        ...item,
        coldkey: hexToSs58(item.coldkey) ?? item.coldkey,
      }))
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
        const response = await fetch(
          `${SN45_API_BASE_URL}/v1/bittensor/subnets/${netuid}/holder-distribution?days=${days}`
        )
        if (!response.ok) {
          return []
        }
        const data = await response.json()
        return data ?? []
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
      const data = response.data

      // Convert all coldkey/hotkey fields from hex to SS58
      return {
        liquidityEvents: data.liquidityEvents.map((e) => ({
          ...e,
          coldkey: hexToSs58(e.coldkey) ?? e.coldkey,
        })),
        stakeSwapsIn: data.stakeSwapsIn.map((e) => ({
          ...e,
          coldkey: hexToSs58(e.coldkey) ?? e.coldkey,
          hotkey: hexToSs58(e.hotkey) ?? e.hotkey,
        })),
        stakeSwapsOut: data.stakeSwapsOut.map((e) => ({
          ...e,
          coldkey: hexToSs58(e.coldkey) ?? e.coldkey,
          hotkey: hexToSs58(e.hotkey) ?? e.hotkey,
        })),
        stakeTransfersIn: data.stakeTransfersIn.map((e) => ({
          ...e,
          originColdkey: hexToSs58(e.originColdkey) ?? e.originColdkey,
          destinationColdkey: hexToSs58(e.destinationColdkey) ?? e.destinationColdkey,
          hotkey: hexToSs58(e.hotkey) ?? e.hotkey,
        })),
        stakeTransfersOut: data.stakeTransfersOut.map((e) => ({
          ...e,
          originColdkey: hexToSs58(e.originColdkey) ?? e.originColdkey,
          destinationColdkey: hexToSs58(e.destinationColdkey) ?? e.destinationColdkey,
          hotkey: hexToSs58(e.hotkey) ?? e.hotkey,
        })),
        stakeMovesIn: data.stakeMovesIn.map((e) => ({
          ...e,
          sourceHotkey: hexToSs58(e.sourceHotkey) ?? e.sourceHotkey,
          destHotkey: hexToSs58(e.destHotkey) ?? e.destHotkey,
          destColdkey: hexToSs58(e.destColdkey) ?? e.destColdkey,
        })),
        stakeMovesOut: data.stakeMovesOut.map((e) => ({
          ...e,
          sourceHotkey: hexToSs58(e.sourceHotkey) ?? e.sourceHotkey,
          destHotkey: hexToSs58(e.destHotkey) ?? e.destHotkey,
          destColdkey: hexToSs58(e.destColdkey) ?? e.destColdkey,
        })),
        alphaBurns: data.alphaBurns.map((e) => ({
          ...e,
          coldkey: hexToSs58(e.coldkey) ?? e.coldkey,
          hotkey: hexToSs58(e.hotkey) ?? e.hotkey,
        })),
        alphaRecycles: data.alphaRecycles.map((e) => ({
          ...e,
          coldkey: hexToSs58(e.coldkey) ?? e.coldkey,
          hotkey: hexToSs58(e.hotkey) ?? e.hotkey,
        })),
        autoStakeAdds: data.autoStakeAdds.map((e) => ({
          ...e,
          coldkey: hexToSs58(e.coldkey) ?? e.coldkey,
          hotkey: hexToSs58(e.hotkey) ?? e.hotkey,
        })),
      }
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
}

// Hook to get subnet daily sentiment trend
export const useSubnetDailyTrend = (netuid: number | null | undefined) => {
  return useQuery({
    queryKey: ["sn45", "subnetDailyTrend", netuid],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetDailyTrend(String(netuid))
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
}

// Hook to get subnet tweets
export const useSubnetTweets = (netuid: number | null | undefined, limit = 50) => {
  return useQuery({
    queryKey: ["sn45", "subnetTweets", netuid, limit],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTweets(String(netuid), { limit: String(limit) })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet stake snapshots (for whale activity tracking)
export const useSubnetStakeSnapshots = (
  netuid: number | null | undefined,
  days = 7,
  minAmount = 1000
) => {
  return useQuery({
    queryKey: ["sn45", "subnetStakeSnapshots", netuid, days, minAmount],
    queryFn: async () => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetStakeSnapshots(String(netuid), {
        days: String(days),
        minAmount: String(minAmount),
      })
      return response.data.map((item) => ({
        ...item,
        coldkey: hexToSs58(item.coldkey) ?? item.coldkey,
        hotkey: hexToSs58(item.hotkey) ?? item.hotkey,
      }))
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
}

// Hook to get whale transactions for a subnet
export const useWhaleTransactions = (
  netuid: number | null | undefined,
  options?: {
    limit?: number
    tier?: WhaleTier
    transactionType?: WhaleTransactionType
    minTaoAmount?: number
  }
) => {
  const limit = options?.limit ?? 50
  const tier = options?.tier
  const transactionType = options?.transactionType
  const minTaoAmount = options?.minTaoAmount

  return useQuery({
    queryKey: ["sn45", "whaleTransactions", netuid, limit, tier, transactionType, minTaoAmount],
    queryFn: async (): Promise<WhaleTransaction[]> => {
      if (!netuid) return []
      try {
        const params = new URLSearchParams()
        params.set("limit", String(limit))
        if (tier) params.set("tier", tier)
        if (transactionType) params.set("transactionType", transactionType)
        if (minTaoAmount !== undefined) params.set("minTaoAmount", String(minTaoAmount))

        const response = await fetch(
          `${SN45_API_BASE_URL}/v1/bittensor/subnets/${netuid}/whale-transactions?${params.toString()}`
        )
        if (!response.ok) {
          return []
        }
        const data: WhaleTransaction[] = await response.json()
        // Convert hex addresses to SS58
        return data.map((item) => ({
          ...item,
          coldkey: hexToSs58(item.coldkey) ?? item.coldkey,
          hotkey: hexToSs58(item.hotkey) ?? item.hotkey,
          destinationColdkey: item.destinationColdkey
            ? (hexToSs58(item.destinationColdkey) ?? item.destinationColdkey)
            : null,
        }))
      } catch {
        return []
      }
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
        const params = new URLSearchParams()
        params.set("limit", String(limit))
        if (tier) params.set("tier", tier)
        if (transactionType) params.set("transactionType", transactionType)
        if (minTaoAmount !== undefined) params.set("minTaoAmount", String(minTaoAmount))
        if (netuid !== undefined) params.set("netuid", String(netuid))

        const response = await fetch(
          `${SN45_API_BASE_URL}/v1/bittensor/whale-transactions?${params.toString()}`
        )
        if (!response.ok) {
          return []
        }
        const data: WhaleTransaction[] = await response.json()
        // Convert hex addresses to SS58
        return data.map((item) => ({
          ...item,
          coldkey: hexToSs58(item.coldkey) ?? item.coldkey,
          hotkey: hexToSs58(item.hotkey) ?? item.hotkey,
          destinationColdkey: item.destinationColdkey
            ? (hexToSs58(item.destinationColdkey) ?? item.destinationColdkey)
            : null,
        }))
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
  const { data: economics, isLoading: economicsLoading } = useSubnetEconomics()
  const { data: sentimentList, isLoading: sentimentLoading } = useSubnetSentimentList()
  const { data: taoPrice } = useTaoPrice()

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
