import { subNativeTokenId } from "@talismn/chaindata-provider"
import { useCombinedSubnetData } from "@ui/domains/Staking/Bittensor/hooks/dTao/useCombinedSubnetData"
import { useTokenRates } from "@ui/state/tokenRates"
import { useMemo } from "react"

import { useSubnetLeaderboardEntry, useSubnetTokenomics } from "../../../hooks/useSn45Api"
import { useSubnetMarkets } from "../../../hooks/useSubnetMarkets"
import { ALPHA_MAX_SUPPLY } from "../../../shared/constants"
import { useTaoDashboardNetworkId } from "../../../shared/TaoDashboardNetworkProvider"
import { raoToTao } from "../../../shared/util"

export interface SubnetStatsData {
  tokenPrice: number | null
  tokenPriceUsd: number | null
  taoUsdPrice: number | null
  priceChange24h: number | null
  marketCap: number | null
  volume24h: number | null
  fdv: number | null
  dailyEmissions: number | null
}

export function useSubnetStats(netuid: number) {
  const networkId = useTaoDashboardNetworkId()
  const taoUsdPrice = useTokenRates(subNativeTokenId(networkId))?.usd?.price ?? null
  const { data: markets, isLoading: isMarketsLoading } = useSubnetMarkets()
  const { data: tokenomics, isLoading: isTokenomicsLoading } = useSubnetTokenomics(netuid)
  const { data: leaderboard, isLoading: isLeaderboardLoading } = useSubnetLeaderboardEntry(
    netuid,
    "1d"
  )
  // Still needed for daily emissions (per-block emission rate)
  const { subnetData, isLoading: isSubnetDataLoading } = useCombinedSubnetData(networkId)

  const isLoading =
    isMarketsLoading || isTokenomicsLoading || isLeaderboardLoading || isSubnetDataLoading

  const data = useMemo((): SubnetStatsData => {
    const currentSubnet = subnetData.find((s) => Number(s.netuid) === netuid)

    const market = markets?.get(netuid)
    const tokenPrice = market?.priceTao ?? (tokenomics ? parseFloat(tokenomics.movingPrice) : null)
    const tokenPriceUsd = tokenPrice && taoUsdPrice ? tokenPrice * taoUsdPrice : null

    // price change and volume need history: the leaderboard has it, the chain doesn't
    const priceChange24h = leaderboard?.priceChange ?? null

    const mcapTao = market?.mcapTao ?? null
    const marketCap = mcapTao !== null && taoUsdPrice ? mcapTao * taoUsdPrice : null

    const volume24h =
      leaderboard && taoUsdPrice !== null ? raoToTao(leaderboard.volume) * taoUsdPrice : null

    // FDV = token price × max supply (21M alpha per subnet)
    const fdv = tokenPriceUsd ? tokenPriceUsd * ALPHA_MAX_SUPPLY : null

    // The Taostats emission field is per-block TAO-side only (dTAO splits 50/50 between TAO and alpha pools),
    // so we multiply by 2 to get the total emission rate.
    const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null
    const dailyEmissions = emissionRaw !== null ? raoToTao(emissionRaw) * 2 * 7200 : null

    return {
      tokenPrice,
      tokenPriceUsd,
      taoUsdPrice,
      priceChange24h,
      marketCap,
      volume24h,
      fdv,
      dailyEmissions,
    }
  }, [netuid, subnetData, leaderboard, markets, taoUsdPrice, tokenomics])

  return { data, isLoading }
}
