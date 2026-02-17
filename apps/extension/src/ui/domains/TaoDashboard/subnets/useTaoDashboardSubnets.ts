import { type Balance, Balances } from "@talismn/balances"
import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useBalances, useTokens } from "@ui/state"
import { useMemo } from "react"
import {
  type SubnetLeaderboardRow,
  useSubnetEconomicsWithSentiment,
  useSubnetLeaderboard,
  useTaoPrice,
} from "../hooks/useSn45Api"
import type { TimePeriod } from "../shared/types"
import { getLeaderboardPeriod } from "../shared/util"
import { BITTENSOR_NETWORK_ID } from "./constants"

type SubnetSentiment = "bullish" | "bearish" | null

// Convert bigint string to number with decimals (values are in rao, 1e9)
const parseRaoToNumber = (value: string | null | undefined): number => {
  if (!value) return 0
  return Number(BigInt(value)) / 1e9
}

export const useTaoDashboardSubnets = (period: TimePeriod) => {
  const leaderboardPeriod = useMemo<"1d" | "1w" | "1m">(
    () => getLeaderboardPeriod(period),
    [period]
  )

  const allTokens = useTokens()
  const {
    data: economicsData,
    isLoading: isEconomicsLoading,
    isError: isEconomicsError,
  } = useSubnetEconomicsWithSentiment()
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    isError: isLeaderboardError,
  } = useSubnetLeaderboard(leaderboardPeriod)
  const { data: taoPrice, isLoading: isTaoPriceLoading, isError: isTaoPriceError } = useTaoPrice()

  const { selectedAccounts } = usePortfolioNavigation()

  const balances = useBalances("all")
  const balancesStatus = useBalancesStatus(balances)

  const subnetTokens = useMemo(() => {
    return allTokens.filter(
      (token): token is SubDTaoToken =>
        token.type === "substrate-dtao" &&
        !!token.netuid && // ignore root
        !token.hotkey && // ignore dynamic tokens
        token.networkId === BITTENSOR_NETWORK_ID // ignore testnet
    )
  }, [allTokens])

  const balancesPerNetuid = useMemo(() => {
    return balances.each.reduce((acc, b) => {
      if (
        b.token?.type === "substrate-dtao" &&
        b.token.networkId === BITTENSOR_NETWORK_ID &&
        selectedAccounts.some((acc) => isAddressEqual(acc.address, b.address))
      ) {
        if (!acc.has(b.token.netuid)) acc.set(b.token.netuid, [])
        acc.get(b.token.netuid)?.push(b)
      }
      return acc
    }, new Map<number, Balance[]>())
  }, [balances, selectedAccounts])

  // Create a map for quick lookup of economics data by netuid
  const economicsMap = useMemo(() => {
    return new Map(economicsData.map((e) => [e.netuid, e]))
  }, [economicsData])

  // Index leaderboard by netuid
  const leaderboardMap = useMemo(() => {
    if (!leaderboardData?.subnets) return new Map<number, SubnetLeaderboardRow>()
    return new Map<number, SubnetLeaderboardRow>(leaderboardData.subnets.map((s) => [s.netuid, s]))
  }, [leaderboardData])

  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0

  const subnets = useMemo(() => {
    return subnetTokens
      .map((token) => {
        const economics = economicsMap.get(token.netuid)
        const leaderboard = leaderboardMap.get(token.netuid)
        // const placeholder = getPlaceholderBalance(token.netuid)

        // Use leaderboard price if available, fallback to economics
        const priceTao = leaderboard?.currentPrice ?? economics?.price
        const priceUsd = typeof priceTao === "number" ? priceTao * taoUsdPrice : undefined

        // Use leaderboard data for price change, staked, mcap, volume
        const priceChange = leaderboard?.priceChange ?? undefined
        const stakedAlpha = parseRaoToNumber(leaderboard?.stakedAlpha)
        // mcap and volume from API are in TAO (rao units)
        const mcap = parseRaoToNumber(leaderboard?.mcap)
        const volume = leaderboard ? parseRaoToNumber(leaderboard.volume) : (economics?.volume ?? 0)

        // Use emissionPct and score directly from the API
        const emission = leaderboard?.emissionPct ?? 0
        const score = leaderboard?.score ?? 0

        // Determine sentiment based on score
        const sentiment: SubnetSentiment = score >= 80 ? "bullish" : score <= 20 ? "bearish" : null

        const balances = balancesPerNetuid.has(token.netuid)
          ? (new Balances(balancesPerNetuid.get(token.netuid)!) ?? 0)
          : null

        return {
          netuid: token.netuid,
          token,

          priceTao,
          priceUsd,
          priceChange,
          score,
          sentiment,
          volume,
          netAlpha: economics?.netAlpha ?? 0,
          flowDirection: economics?.flowDirection ?? ("neutral" as const),
          sentimentScore: economics?.sentimentScore ?? 0,
          // Balance from placeholder (needs wallet integration)
          balance: balances?.sum.planck.transferable ?? null,
          balanceUsd: balances?.sum.fiat("usd").transferable ?? null,
          // Real data from leaderboard
          stakedTao: priceTao ? stakedAlpha * priceTao : undefined, // Convert alpha to TAO equivalent
          stakedAlpha,
          mcap,
          emission,
          chartData: leaderboard?.priceHistory7d,
        }
      })
      .sort((a, b) => a.token.netuid - b.token.netuid)
  }, [subnetTokens, economicsMap, leaderboardMap, taoUsdPrice, balancesPerNetuid])

  const loading = useMemo(
    () => ({
      price: isLeaderboardLoading || isEconomicsLoading || isTaoPriceLoading,
      balance: balancesStatus.status === "fetching",
      score: isLeaderboardLoading,
      staked: isLeaderboardLoading,
      volume: isLeaderboardLoading || isEconomicsLoading,
      mcap: isLeaderboardLoading,
      emission: isLeaderboardLoading,
      chart: isLeaderboardLoading,
    }),
    [isLeaderboardLoading, isEconomicsLoading, isTaoPriceLoading, balancesStatus.status]
  )

  const errors = useMemo(
    () => ({
      price: isLeaderboardError || isEconomicsError || isTaoPriceError,
      balance: false,
      score: isLeaderboardError,
      staked: isLeaderboardError,
      volume: isLeaderboardError || isEconomicsError,
      mcap: isLeaderboardError,
      emission: isLeaderboardError,
      chart: isLeaderboardError,
    }),
    [isLeaderboardError, isEconomicsError, isTaoPriceError]
  )

  const isLoading = Object.values(loading).some(Boolean)
  const isError = Object.values(errors).some(Boolean)

  return { subnets, isLoading, isError, loading, errors }
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>["subnets"][number]
export type TaoDashboardSubnetsLoading = ReturnType<typeof useTaoDashboardSubnets>["loading"]
export type TaoDashboardSubnetsErrors = ReturnType<typeof useTaoDashboardSubnets>["errors"]
