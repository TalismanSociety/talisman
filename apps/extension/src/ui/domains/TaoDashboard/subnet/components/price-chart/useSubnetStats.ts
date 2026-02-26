import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useMemo } from "react"

import {
  useSubnetLeaderboardEntry,
  useSubnetTokenomics,
  useTaoPrice,
} from "../../../hooks/useSn45Api"
import { ALPHA_MAX_SUPPLY } from "../../../shared/constants"
import { raoToTao } from "../../../shared/util"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"

export interface SubnetStatsData {
  tokenPrice: number | null
  tokenPriceUsd: number | null
  priceChange24h: number | null
  marketCap: number | null
  volume24h: number | null
  fdv: number | null
  dailyEmissions: number | null
}

export function useSubnetStats(netuid: number) {
  const {
    data: taoPrice,
    isLoading: isTaoPriceLoading,
    isError: isTaoPriceError,
    error: taoPriceError,
  } = useTaoPrice()
  const {
    data: tokenomics,
    isLoading: isTokenomicsLoading,
    isError: isTokenomicsError,
    error: tokenomicsError,
  } = useSubnetTokenomics(netuid)
  const {
    data: leaderboard,
    isLoading: isLeaderboardLoading,
    isError: isLeaderboardError,
  } = useSubnetLeaderboardEntry(netuid, "1d")
  // Still needed for daily emissions (emission + tempo)
  const { subnetData, isLoading: isSubnetDataLoading } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const isLoading =
    isTaoPriceLoading || isTokenomicsLoading || isLeaderboardLoading || isSubnetDataLoading
  const isError = isTaoPriceError || isTokenomicsError || isLeaderboardError
  const error = taoPriceError ?? tokenomicsError ?? null

  const data = useMemo((): SubnetStatsData => {
    const currentSubnet = subnetData.find((s) => Number(s.netuid) === netuid)

    const tokenPrice = tokenomics ? parseFloat(tokenomics.movingPrice) : null
    const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : null
    const tokenPriceUsd = tokenPrice && taoUsdPrice ? tokenPrice * taoUsdPrice : null

    // Use leaderboard for price change, mcap, and volume (same source as subnets list)
    const priceChange24h = leaderboard?.priceChange ?? null

    // Market cap from leaderboard squid proxy (price × circulating supply), converted to USD
    const mcapTao = leaderboard?.mcap ? raoToTao(leaderboard.mcap) : null
    const marketCap = mcapTao !== null && taoUsdPrice ? mcapTao * taoUsdPrice : null

    const volumeTao = raoToTao(leaderboard?.volume)
    const volume24h = taoUsdPrice !== null ? volumeTao * taoUsdPrice : null

    // FDV = token price × max supply (21M alpha per subnet)
    const fdv = tokenPriceUsd ? tokenPriceUsd * ALPHA_MAX_SUPPLY : null

    const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null
    const dailyEmissions = emissionRaw
      ? raoToTao(emissionRaw) * (7200 / (currentSubnet?.tempo ?? 360))
      : null

    return {
      tokenPrice,
      tokenPriceUsd,
      priceChange24h,
      marketCap,
      volume24h,
      fdv,
      dailyEmissions,
    }
  }, [netuid, subnetData, leaderboard, taoPrice, tokenomics])

  return { data, isLoading, isError, error }
}
