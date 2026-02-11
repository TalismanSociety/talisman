import { useQueries } from "@tanstack/react-query"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { Sn45Api } from "extension-core"
import { SN45_API_BASE_URL } from "extension-shared"

import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"

const sn45Api = new Sn45Api({ baseUrl: SN45_API_BASE_URL })

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
  const { subnetData } = useCombinedSubnetData(BITTENSOR_NETWORK_ID)

  return useQueries({
    queries: [
      {
        queryKey: ["sn45", "taoPrice"],
        queryFn: async () => {
          const response = await sn45Api.v1.getTaoPrice()
          return response.data
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
      },
      {
        queryKey: ["sn45", "subnetTokenomics", netuid],
        queryFn: async () => {
          const response = await sn45Api.v1.getSubnetTokenomics(String(netuid))
          return response.data
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
      },
    ],
    combine: (results) => {
      const [taoPriceQuery, tokenomicsQuery] = results
      const taoPrice = taoPriceQuery.data
      const tokenomics = tokenomicsQuery.data

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
        data: {
          tokenPrice,
          tokenPriceUsd,
          priceChange24h,
          marketCap,
          volume24h,
          fdv,
          dailyEmissions,
        } satisfies SubnetStatsData,
        isLoading: taoPriceQuery.isLoading || tokenomicsQuery.isLoading,
        isError: taoPriceQuery.isError || tokenomicsQuery.isError,
        error: taoPriceQuery.error ?? tokenomicsQuery.error ?? null,
      }
    },
  })
}
