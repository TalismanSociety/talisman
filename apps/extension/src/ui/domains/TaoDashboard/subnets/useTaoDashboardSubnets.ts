import { type Balance, Balances } from "@talismn/balances"
import { type SubDTaoToken, subNativeTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, isEthereumAddress } from "@talismn/crypto"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useBalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useBalances } from "@ui/state/balances"
import { useTokens } from "@ui/state/chaindata"
import { useMemo } from "react"
import { useAlphaPricesByNetuid } from "../hooks/useAlphaPricesByNetuid"
import { type SubnetLeaderboardRow, useSubnetLeaderboard, useTaoPrice } from "../hooks/useSn45Api"
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
  const { data: taoPrice, isLoading: isTaoPriceLoading, isError: isTaoPriceError } = useTaoPrice()

  const { networkId, isMainnet } = useTaoDashboardNetwork()
  const { selectedAccounts } = usePortfolioNavigation()

  const {
    data: alphaPrices,
    isLoading: isAlphaPricesLoading,
    isError: isAlphaPricesError,
  } = useAlphaPricesByNetuid()

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

  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0

  const subnets = useMemo(() => {
    return subnetTokens
      .map((token) => {
        const leaderboard = leaderboardMap.get(token.netuid)

        // the on-chain pool price covers networks without leaderboard data (testnet)
        const priceTao = leaderboard?.currentPrice ?? alphaPrices?.get(token.netuid)
        const priceUsd = typeof priceTao === "number" ? priceTao * taoUsdPrice : undefined

        const priceChange = leaderboard?.priceChange ?? undefined
        const stakedAlpha = raoToTao(leaderboard?.stakedAlpha)
        const stakedTao = raoToTao(leaderboard?.stakedTao)
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

        // First selected account that has staked alpha on this subnet
        const unstakeAddress =
          balancesPerNetuid.get(token.netuid)?.find((b) => b.free.planck > 0n)?.address ?? undefined

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
          // outside mainnet tokens are unpriced and the fiat sum fabricates a $0.00
          balanceUsd: isMainnet ? (balances?.sum.fiat("usd").transferable ?? null) : null,
          unstakeAddress,
          stakedTao: stakedTao || (priceTao ? stakedAlpha * priceTao : undefined),
          stakedAlpha,
          mcapUsd: mcap,
          volumeUsd: volume * taoUsdPrice,
          emission,
          chartData: leaderboard?.priceHistory7d,
        }
      })
      .sort((a, b) => a.token.netuid - b.token.netuid)
  }, [subnetTokens, leaderboardMap, taoUsdPrice, balancesPerNetuid, alphaPrices, isMainnet])

  const loading = useMemo(
    () => ({
      // on mainnet the on-chain alpha prices are only a fallback for subnets the leaderboard
      // doesn't know yet: don't keep the whole column pulsing while they load
      price: isMainnet ? isLeaderboardLoading || isTaoPriceLoading : isAlphaPricesLoading,
      balance: balancesStatus.status === "fetching",
      score: isLeaderboardLoading,
      staked: isLeaderboardLoading,
      volume: isLeaderboardLoading,
      mcap: isLeaderboardLoading,
      emission: isLeaderboardLoading,
      chart: isLeaderboardLoading,
    }),
    [
      isMainnet,
      isLeaderboardLoading,
      isTaoPriceLoading,
      isAlphaPricesLoading,
      balancesStatus.status,
    ]
  )

  // outside mainnet the sn45 queries are disabled: flag their columns so cells render N/A
  // instead of misleading zeros — except price, which falls back to the on-chain pool price
  const errors = useMemo(
    () => ({
      price: isMainnet ? isLeaderboardError || isTaoPriceError : isAlphaPricesError,
      balance: false,
      score: !isMainnet || isLeaderboardError,
      staked: !isMainnet || isLeaderboardError,
      volume: !isMainnet || isLeaderboardError,
      mcap: !isMainnet || isLeaderboardError,
      emission: !isMainnet || isLeaderboardError,
      chart: !isMainnet || isLeaderboardError,
    }),
    [isLeaderboardError, isMainnet, isTaoPriceError, isAlphaPricesError]
  )

  const isLoading = Object.values(loading).some(Boolean)
  const isError = Object.values(errors).some(Boolean)

  return { subnets, stakeAddress, isLoading, isError, loading, errors }
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>["subnets"][number]
export type TaoDashboardSubnetsLoading = ReturnType<typeof useTaoDashboardSubnets>["loading"]
export type TaoDashboardSubnetsErrors = ReturnType<typeof useTaoDashboardSubnets>["errors"]
