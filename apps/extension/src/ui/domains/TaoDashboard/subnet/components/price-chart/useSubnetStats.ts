import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useMemo } from "react"

import { useSubnetTokenomics, useTaoPrice } from "../../../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"

export interface SubnetStats {
  tokenPrice: number | null
  tokenPriceUsd: number | null
  priceChange24h: number | null
  marketCap: number | null
  volume24h: number | null
  fdv: number | null
  dailyEmissions: number | null
  isLoading: boolean
}

export function useSubnetStats(netuid: number): SubnetStats {
  const { data: taoPrice } = useTaoPrice()
  const { data: tokenomics, isLoading } = useSubnetTokenomics(netuid)
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  return useMemo(() => {
    // Get current subnet data for market cap, volume, etc.
    const currentSubnet = subnetData.find((s) => Number(s.netuid) === netuid)

    // Current token price in TAO and USD
    const tokenPrice = tokenomics ? parseFloat(tokenomics.movingPrice) : null
    const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : null
    const tokenPriceUsd = tokenPrice && taoUsdPrice ? tokenPrice * taoUsdPrice : null

    // Calculate price change percentage (24h)
    const priceChange24h = currentSubnet?.price_change_1_day
      ? parseFloat(currentSubnet.price_change_1_day)
      : null

    // Market stats
    const marketCap = currentSubnet?.market_cap ? parseFloat(currentSubnet.market_cap) : null
    const volume24h = currentSubnet?.tao_volume_24_hr
      ? parseFloat(currentSubnet.tao_volume_24_hr) * (taoUsdPrice || 0)
      : null
    const totalAlpha = currentSubnet?.total_alpha ? parseFloat(currentSubnet.total_alpha) : null
    const fdv = totalAlpha && tokenPriceUsd ? totalAlpha * tokenPriceUsd : null

    // Daily emissions in TAO
    const emissionRaw = currentSubnet?.emission ? BigInt(currentSubnet.emission) : null
    const dailyEmissions = emissionRaw
      ? (Number(emissionRaw) / 1e9) * (7200 / (currentSubnet?.tempo || 360))
      : null

    return {
      tokenPrice,
      tokenPriceUsd,
      priceChange24h,
      marketCap,
      volume24h,
      fdv,
      dailyEmissions,
      isLoading,
    }
  }, [netuid, subnetData, tokenomics, taoPrice, isLoading])
}
