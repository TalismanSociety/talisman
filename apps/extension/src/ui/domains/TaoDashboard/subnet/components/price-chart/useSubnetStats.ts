import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useMemo } from "react"

import { useSubnetTokenomics, useTaoPrice } from "../../../hooks/useSn45Api"
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
    subnetData,
    isLoading: isSubnetDataLoading,
    isError: isSubnetDataError,
  } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  const isLoading = isTaoPriceLoading || isTokenomicsLoading || isSubnetDataLoading
  const isError = isTaoPriceError || isTokenomicsError || isSubnetDataError
  const error = taoPriceError ?? tokenomicsError ?? null

  const data = useMemo((): SubnetStatsData => {
    const currentSubnet = subnetData.find((s) => Number(s.netuid) === netuid)

    const tokenPrice = tokenomics ? parseFloat(tokenomics.movingPrice) : null
    const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : null
    const tokenPriceUsd = tokenPrice && taoUsdPrice ? tokenPrice * taoUsdPrice : null

    const priceChange24h = currentSubnet?.price_change_1_day
      ? parseFloat(currentSubnet.price_change_1_day)
      : null

    const marketCap = currentSubnet?.market_cap ? parseFloat(currentSubnet.market_cap) : null
    const volume24h = currentSubnet?.tao_volume_24_hr
      ? parseFloat(currentSubnet.tao_volume_24_hr) * (taoUsdPrice || 0)
      : null
    const totalAlpha = currentSubnet?.total_alpha ? parseFloat(currentSubnet.total_alpha) : null
    const fdv = totalAlpha && tokenPriceUsd ? totalAlpha * tokenPriceUsd : null

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
    }
  }, [netuid, subnetData, taoPrice, tokenomics])

  return { data, isLoading, isError, error }
}
