import { type Balance, Balances } from "@talismn/balances"
import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useBalances } from "@ui/state/balances"
import { useTokens } from "@ui/state/chaindata"
import { useMemo } from "react"
import { type SubnetLeaderboardRow, useSubnetLeaderboard, useTaoPrice } from "../hooks/useSn45Api"
import type { TimePeriod } from "../shared/types"
import { raoToTao } from "../shared/util"
import { BITTENSOR_NETWORK_ID } from "./constants"

type SubnetSentiment = "bullish" | "bearish" | null

export const useTaoDashboardSubnets = (period: TimePeriod) => {
  const allTokens = useTokens()
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    isError: isLeaderboardError,
  } = useSubnetLeaderboard(period)
  const { data: taoPrice, isLoading: isTaoPriceLoading, isError: isTaoPriceError } = useTaoPrice()

  const { selectedAccounts } = usePortfolioNavigation()

  const balances = useBalances("all")
  const balancesStatus = useBalancesStatus(balances)

  const subnetTokens = useMemo(() => {
    return allTokens.filter(
      (token): token is SubDTaoToken =>
        token.type === "substrate-dtao" &&
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

  // Index leaderboard by netuid
  const leaderboardMap = useMemo(() => {
    if (!leaderboardData?.subnets) return new Map<number, SubnetLeaderboardRow>()
    return new Map<number, SubnetLeaderboardRow>(leaderboardData.subnets.map((s) => [s.netuid, s]))
  }, [leaderboardData])

  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0

  const subnets = useMemo(() => {
    return subnetTokens
      .map((token) => {
        const leaderboard = leaderboardMap.get(token.netuid)

        const priceTao = leaderboard?.currentPrice ?? undefined
        const priceUsd = typeof priceTao === "number" ? priceTao * taoUsdPrice : undefined

        const priceChange = leaderboard?.priceChange ?? undefined
        const stakedAlpha = raoToTao(leaderboard?.stakedAlpha)
        const volume = raoToTao(leaderboard?.volume)

        const emission = leaderboard?.emissionPct ?? 0
        const score = leaderboard?.score ?? 0

        // Market cap from leaderboard squid proxy (price × circulating supply), converted to USD
        const mcap = leaderboard?.mcap ? raoToTao(leaderboard.mcap) * taoUsdPrice : 0

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
          mcap,
          balance: balances?.sum.planck.transferable ?? null,
          balanceUsd: balances?.sum.fiat("usd").transferable ?? null,
          stakedTao: priceTao ? stakedAlpha * priceTao : undefined,
          stakedAlpha,
          mcapUsd: mcap,
          volumeUsd: volume * taoUsdPrice,
          emission,
          chartData: leaderboard?.priceHistory7d,
        }
      })
      .sort((a, b) => a.token.netuid - b.token.netuid)
  }, [subnetTokens, leaderboardMap, taoUsdPrice, balancesPerNetuid])

  const loading = useMemo(
    () => ({
      price: isLeaderboardLoading || isTaoPriceLoading,
      balance: balancesStatus.status === "fetching",
      score: isLeaderboardLoading,
      staked: isLeaderboardLoading,
      volume: isLeaderboardLoading,
      mcap: isLeaderboardLoading,
      emission: isLeaderboardLoading,
      chart: isLeaderboardLoading,
    }),
    [isLeaderboardLoading, isTaoPriceLoading, balancesStatus.status]
  )

  const errors = useMemo(
    () => ({
      price: isLeaderboardError || isTaoPriceError,
      balance: false,
      score: isLeaderboardError,
      staked: isLeaderboardError,
      volume: isLeaderboardError,
      mcap: isLeaderboardError,
      emission: isLeaderboardError,
      chart: isLeaderboardError,
    }),
    [isLeaderboardError, isTaoPriceError]
  )

  const isLoading = Object.values(loading).some(Boolean)
  const isError = Object.values(errors).some(Boolean)

  return { subnets, isLoading, isError, loading, errors }
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>["subnets"][number]
export type TaoDashboardSubnetsLoading = ReturnType<typeof useTaoDashboardSubnets>["loading"]
export type TaoDashboardSubnetsErrors = ReturnType<typeof useTaoDashboardSubnets>["errors"]
