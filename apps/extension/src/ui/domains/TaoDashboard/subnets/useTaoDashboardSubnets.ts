import { type Balance, Balances } from "@talismn/balances"
import { type SubDTaoToken, subNativeTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, isEthereumAddress } from "@talismn/crypto"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useBalances } from "@ui/state/balances"
import { useTokens } from "@ui/state/chaindata"
import { useTokenRates } from "@ui/state/tokenRates"
import { useMemo } from "react"
import { type SubnetLeaderboardRow, useSubnetLeaderboard } from "../hooks/useSn45Api"
import { useSubnetMarkets } from "../hooks/useSubnetMarkets"
import { useTaoDashboardNetwork } from "../shared/TaoDashboardNetworkProvider"
import type { TimePeriod } from "../shared/types"
import { raoToTao } from "../shared/util"

type SubnetSentiment = "bullish" | "bearish" | null

export const useTaoDashboardSubnets = (period: TimePeriod) => {
  const allTokens = useTokens()
  const {
    data: leaderboardData,
    isLoading: isLeaderboardLoading,
    isError: isLeaderboardError,
  } = useSubnetLeaderboard(period)

  const { networkId, isMainnet } = useTaoDashboardNetwork()
  const { selectedAccounts } = usePortfolioNavigation()

  const { data: markets, isLoading: isMarketsLoading, isError: isMarketsError } = useSubnetMarkets()

  const taoUsdPrice = useTokenRates(subNativeTokenId(networkId))?.usd?.price ?? undefined

  const balances = useBalances("all")
  const balancesStatus = useBalancesStatus(balances)

  const subnetTokens = useMemo(() => {
    return allTokens.filter(
      (token): token is SubDTaoToken =>
        token.type === "substrate-dtao" &&
        !token.hotkey && // ignore dynamic tokens
        token.networkId === networkId
    )
  }, [allTokens, networkId])

  const balancesPerNetuid = useMemo(() => {
    return balances.each.reduce((acc, b) => {
      if (
        b.token?.type === "substrate-dtao" &&
        b.token.networkId === networkId &&
        selectedAccounts.some((acc) => isAddressEqual(acc.address, b.address))
      ) {
        if (!acc.has(b.token.netuid)) acc.set(b.token.netuid, [])
        acc.get(b.token.netuid)?.push(b)
      }
      return acc
    }, new Map<number, Balance[]>())
  }, [balances, networkId, selectedAccounts])

  // Find the first selected substrate account with transferable native TAO
  const stakeAddress = useMemo(() => {
    const nativeTokenId = subNativeTokenId(networkId)
    for (const acc of selectedAccounts) {
      if (isEthereumAddress(acc.address)) continue
      const bal = balances.each.find(
        (b) =>
          b.tokenId === nativeTokenId &&
          isAddressEqual(b.address, acc.address) &&
          b.transferable.planck > 0n
      )
      if (bal) return acc.address
    }
    return undefined
  }, [selectedAccounts, balances, networkId])

  // Index leaderboard by netuid
  const leaderboardMap = useMemo(() => {
    if (!leaderboardData?.subnets) return new Map<number, SubnetLeaderboardRow>()
    return new Map<number, SubnetLeaderboardRow>(leaderboardData.subnets.map((s) => [s.netuid, s]))
  }, [leaderboardData])

  const subnets = useMemo(() => {
    const toUsd = (tao: number | undefined) =>
      tao !== undefined && taoUsdPrice !== undefined ? tao * taoUsdPrice : undefined

    return subnetTokens
      .map((token) => {
        const leaderboard = leaderboardMap.get(token.netuid)
        const market = markets?.get(token.netuid)

        const priceTao = market?.priceTao ?? leaderboard?.currentPrice ?? undefined
        const priceChange = leaderboard?.priceChange ?? undefined
        const volume = raoToTao(leaderboard?.volume)
        const mcap = market?.mcapTao ?? undefined
        const score = leaderboard?.score ?? 0

        // Determine sentiment based on score
        const sentiment: SubnetSentiment = score >= 80 ? "bullish" : score <= 20 ? "bearish" : null

        const balances = balancesPerNetuid.has(token.netuid)
          ? (new Balances(balancesPerNetuid.get(token.netuid)!) ?? 0)
          : null

        // First selected account that has staked alpha on this subnet
        const unstakeAddress =
          balancesPerNetuid.get(token.netuid)?.find((b) => b.free.planck > 0n)?.address ?? undefined

        return {
          netuid: token.netuid,
          token,

          priceTao,
          priceUsd: toUsd(priceTao),
          priceChange,
          score,
          sentiment,
          volume,
          mcap,
          balance: balances?.sum.planck.transferable ?? null,
          // outside mainnet tokens are unpriced and the fiat sum fabricates a $0.00
          balanceUsd: isMainnet ? (balances?.sum.fiat("usd").transferable ?? null) : null,
          unstakeAddress,
          stakedTao: market?.stakedTao,
          stakedAlpha: market?.stakedAlpha ?? 0,
          mcapUsd: toUsd(mcap),
          volumeUsd: toUsd(volume),
          emission: market?.emissionPct ?? 0,
          chartData: leaderboard?.priceHistory7d,
        }
      })
      .sort((a, b) => a.token.netuid - b.token.netuid)
  }, [subnetTokens, leaderboardMap, markets, taoUsdPrice, balancesPerNetuid, isMainnet])

  const loading = useMemo(
    () => ({
      // price comes from chain, with the sn45 leaderboard price as a fallback: it's only
      // loading until one of them has data
      price: !markets && !leaderboardData && (isMarketsLoading || isLeaderboardLoading),
      balance: balancesStatus.status === "fetching",
      score: isLeaderboardLoading,
      staked: isMarketsLoading,
      volume: isLeaderboardLoading,
      mcap: isMarketsLoading,
      emission: isMarketsLoading,
      chart: isLeaderboardLoading,
    }),
    [markets, leaderboardData, isMarketsLoading, isLeaderboardLoading, balancesStatus.status]
  )

  // outside mainnet the sn45 queries are disabled: flag their columns so cells render N/A
  // instead of misleading zeros. Chain columns work on every network, but mcap also needs a
  // TAO rate to be shown in USD
  const errors = useMemo(
    () => ({
      price: isMarketsError && (!isMainnet || isLeaderboardError),
      balance: false,
      score: !isMainnet || isLeaderboardError,
      staked: isMarketsError,
      volume: !isMainnet || isLeaderboardError,
      mcap: isMarketsError || taoUsdPrice === undefined,
      emission: isMarketsError,
      chart: !isMainnet || isLeaderboardError,
    }),
    [isMainnet, isLeaderboardError, isMarketsError, taoUsdPrice]
  )

  const isLoading = Object.values(loading).some(Boolean)
  const isError = Object.values(errors).some(Boolean)

  return { subnets, stakeAddress, isLoading, isError, loading, errors }
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>["subnets"][number]
export type TaoDashboardSubnetsLoading = ReturnType<typeof useTaoDashboardSubnets>["loading"]
export type TaoDashboardSubnetsErrors = ReturnType<typeof useTaoDashboardSubnets>["errors"]
