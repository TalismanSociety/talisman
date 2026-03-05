import { useQuery } from "@tanstack/react-query"
import { gandalfFetch } from "@ui/util/gandalfFetch"
import { getSn45Api } from "extension-core"
import { useMemo } from "react"

import type { TimePeriod } from "../shared/types"

// Create a singleton API instance with Gandalf auth injected via customFetch
export const sn45Api = getSn45Api(gandalfFetch)

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
    queryFn: async ({ signal }) => {
      const response = await sn45Api.v1.getTaoPrice({ signal })
      return response.data
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet leaderboard data
export const useSubnetLeaderboard = (period: TimePeriod = "1d") => {
  return useQuery({
    queryKey: ["sn45", "subnetLeaderboard", period],
    queryFn: async ({
      signal,
    }): Promise<
      Omit<SubnetLeaderboardResponse, "subnets"> & { subnets: SubnetLeaderboardRow[] }
    > => {
      const response = await sn45Api.v1.getSubnetLeaderboard({ period }, { signal })
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
  period: TimePeriod = "1d"
) => {
  const query = useSubnetLeaderboard(period)

  const data = useMemo(() => {
    if (!query.data) return null
    return query.data.subnets.find((subnet) => subnet.netuid === netuid) ?? null
  }, [query.data, netuid])

  return { ...query, data }
}

// Hook to get subnet tokenomics
export const useSubnetTokenomics = (netuid: number | null | undefined) => {
  return useQuery({
    queryKey: ["sn45", "subnetTokenomics", netuid],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTokenomics(String(netuid), { signal })
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
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetStakeEvents(String(netuid), { signal })
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
  period: TimePeriod = "1d"
) => {
  return useQuery({
    queryKey: ["sn45", "subnetTradeFlow", netuid, period],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTradeFlow(String(netuid), { period }, { signal })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet TAO flow (time-series + totals in one request)
export const useSubnetTaoFlow = (netuid: number | null | undefined, period: TimePeriod = "1w") => {
  return useQuery({
    queryKey: ["sn45", "subnetTaoFlow", netuid, period],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTaoFlow(String(netuid), { period }, { signal })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Hook to get subnet holder metrics
export const useSubnetHolders = (netuid: number | null | undefined, period: TimePeriod = "1m") => {
  return useQuery({
    queryKey: ["sn45", "subnetHolders", netuid, period],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetHolders(
        String(netuid),
        {
          period,
        },
        { signal }
      )
      return response.data ?? null
    },
    enabled: !!netuid,
    refetchInterval: 300_000, // 5 minutes
    staleTime: 300_000,
  })
}

export const useSubnetSentiment = (netuid: number | null | undefined, period?: TimePeriod) => {
  return useQuery({
    queryKey: ["sn45", "subnetSentiment", netuid, period],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetSentiment(String(netuid), { period }, { signal })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 60_000,
  })
}

// Hook to get subnet tweets
export const useSubnetTweets = (netuid: number | null | undefined, period: TimePeriod = "1m") => {
  return useQuery({
    queryKey: ["sn45", "subnetTweets", netuid, period],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetTweets(String(netuid), { period }, { signal })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export const useSubnetWhalesFlow = (netuid: number | null | undefined, period?: TimePeriod) => {
  return useQuery({
    queryKey: ["sn45", "subnetWhalesFlow", netuid, period],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetWhalesFlow(String(netuid), { period }, { signal })
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export const useSubnetWhalesActivity = (netuid: number | null | undefined, period?: TimePeriod) => {
  return useQuery({
    queryKey: ["sn45", "subnetWhalesActivity", netuid, period],
    queryFn: async ({ signal }) => {
      if (!netuid) return null
      const response = await sn45Api.v1.getSubnetWhalesActivity(
        String(netuid),
        { period },
        { signal }
      )
      return response.data
    },
    enabled: !!netuid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export type WhaleTransaction = Awaited<
  ReturnType<typeof sn45Api.v1.getSubnetWhalesActivity>
>["data"][number]

export type WhaleTransactionType = WhaleTransaction["transactionType"]
