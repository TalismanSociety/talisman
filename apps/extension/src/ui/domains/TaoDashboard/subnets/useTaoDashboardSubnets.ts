import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { useTokens } from "@ui/state"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import {
  useSubnetEconomicsWithSentiment,
  useSubnetLeaderboard,
  useTaoPrice,
} from "../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "./constants"

type SubnetSentiment = "bullish" | "bearish" | null

// Placeholder data for user balance (needs wallet integration) and chart data
const PLACEHOLDER_BALANCE: Record<
  number,
  {
    balance: number
    balanceUsd: number
    sentiment: "bullish" | "bearish" | null
    chartData: number[]
  }
> = {
  1: {
    balance: 12450,
    balanceUsd: 5892,
    sentiment: "bullish",
    chartData: [60, 55, 50, 45, 50, 45, 40],
  },
  3: {
    balance: 8200,
    balanceUsd: 101598,
    sentiment: null,
    chartData: [40, 45, 50, 55, 60, 65, 70],
  },
  6: {
    balance: 45000,
    balanceUsd: 123750,
    sentiment: null,
    chartData: [40, 45, 50, 55, 50, 55, 60],
  },
  8: {
    balance: 2100,
    balanceUsd: 44226,
    sentiment: "bearish",
    chartData: [40, 45, 55, 60, 65, 70, 75],
  },
}

// Default placeholder for balance/chart data
const getPlaceholderBalance = (netuid: number) => {
  return (
    PLACEHOLDER_BALANCE[netuid] ?? {
      balance: 0,
      balanceUsd: 0,
      sentiment: null,
      chartData: Array.from({ length: 7 }, () => Math.random() * 100),
    }
  )
}

// Convert bigint string to number with decimals (values are in rao, 1e9)
const parseRaoToNumber = (value: string | null | undefined): number => {
  if (!value) return 0
  return Number(BigInt(value)) / 1e9
}

export const useTaoDashboardSubnets = () => {
  const { t } = useTranslation()
  const allTokens = useTokens()
  const { data: economicsData, isLoading: _isEconomicsLoading } = useSubnetEconomicsWithSentiment()
  const { data: leaderboardData, isLoading: _isLeaderboardLoading } = useSubnetLeaderboard("1d")
  const { data: taoPrice } = useTaoPrice()

  const subnetTokens = useMemo(() => {
    return allTokens.filter(
      (token): token is SubDTaoToken =>
        token.type === "substrate-dtao" &&
        !!token.netuid && // ignore root
        !token.hotkey && // ignore dynamic tokens
        token.networkId === BITTENSOR_NETWORK_ID // ignore testnet
    )
  }, [allTokens])

  // Create a map for quick lookup of economics data by netuid
  const economicsMap = useMemo(() => {
    return new Map(economicsData.map((e) => [e.netuid, e]))
  }, [economicsData])

  // Index leaderboard by netuid
  const leaderboardMap = useMemo(() => {
    if (!leaderboardData?.subnets) return new Map()
    return new Map(leaderboardData.subnets.map((s) => [s.netuid, s]))
  }, [leaderboardData])

  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0

  const subnets = useMemo(() => {
    return subnetTokens
      .map((token) => {
        const economics = economicsMap.get(token.netuid)
        const leaderboard = leaderboardMap.get(token.netuid)
        const placeholder = getPlaceholderBalance(token.netuid)

        // Use leaderboard price if available, fallback to economics
        const priceInTao = leaderboard?.currentPrice ?? economics?.price ?? 0
        const priceUsd = priceInTao * taoUsdPrice

        // Use leaderboard data for price change, staked, mcap, volume
        const priceChange = leaderboard?.priceChange ?? 0
        const stakedAlpha = parseRaoToNumber(leaderboard?.stakedAlpha)
        // mcap and volume from API are in TAO (rao units)
        const mcap = parseRaoToNumber(leaderboard?.mcap)
        const volume = leaderboard ? parseRaoToNumber(leaderboard.volume) : (economics?.volume ?? 0)

        // Use emissionPct and score directly from the API
        const emission = leaderboard?.emissionPct ?? 0
        const score = leaderboard?.score ?? 0

        // Determine sentiment based on score
        const sentiment: SubnetSentiment = score >= 80 ? "bullish" : score <= 20 ? "bearish" : null

        return {
          tokenId: token.id,
          netuid: token.netuid,
          name: token.subnetName ?? t("Subnet {{netuid}}", { netuid: token.netuid }),
          symbol: token.symbol,
          greekSymbol: token.symbol,
          logo: token.logo,
          price: priceInTao,
          priceUsd,
          priceChange,
          score,
          sentiment,
          volume,
          netAlpha: economics?.netAlpha ?? 0,
          flowDirection: economics?.flowDirection ?? ("neutral" as const),
          sentimentScore: economics?.sentimentScore ?? 0,
          // Balance from placeholder (needs wallet integration)
          balance: placeholder.balance,
          balanceUsd: placeholder.balanceUsd,
          // Real data from leaderboard
          stakedTao: stakedAlpha * priceInTao, // Convert alpha to TAO equivalent
          stakedAlpha,
          mcap,
          emission,
          chartData: leaderboard?.priceHistory7d ?? placeholder.chartData,
        }
      })
      .sort((a, b) => a.netuid - b.netuid)
  }, [subnetTokens, economicsMap, leaderboardMap, taoUsdPrice, t])

  return subnets
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>[number]

// Hook for loading state
export const useTaoDashboardSubnetsLoading = () => {
  const { isLoading: economicsLoading } = useSubnetEconomicsWithSentiment()
  const { isLoading: leaderboardLoading } = useSubnetLeaderboard("1d")
  return economicsLoading || leaderboardLoading
}
