import { useQuery } from "@tanstack/react-query"
import { Sn45Api } from "extension-core"
import { useMemo } from "react"

// Use local dev URL in development, otherwise use production
// const SN45_API_BASE_URL = "https://sn45api.talisman.xyz"
const SN45_API_BASE_URL =
  process.env.NODE_ENV === "development" ? "http://localhost:8787" : "https://sn45api.talisman.xyz"

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
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 60_000,
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
