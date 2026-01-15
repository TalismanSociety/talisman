import type { SubDTaoToken } from "@talismn/chaindata-provider"
import { useTokens } from "@ui/state"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useSubnetEconomicsWithSentiment, useTaoPrice } from "../hooks/useSn45Api"
import { BITTENSOR_NETWORK_ID } from "./constants"

export const useTaoDashboardSubnets = () => {
  const { t } = useTranslation()
  const allTokens = useTokens()
  const { data: economicsData, isLoading: _isEconomicsLoading } = useSubnetEconomicsWithSentiment()
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

  const taoUsdPrice = taoPrice?.price ? parseFloat(taoPrice.price) : 0

  const subnets = useMemo(() => {
    return subnetTokens
      .map((token) => {
        const economics = economicsMap.get(token.netuid)
        const priceInTao = economics?.price ?? 0
        const priceUsd = priceInTao * taoUsdPrice

        return {
          tokenId: token.id,
          netuid: token.netuid,
          name: token.subnetName ?? t("Subnet {{netuid}}", { netuid: token.netuid }),
          symbol: token.symbol,
          logo: token.logo,
          price: priceInTao,
          priceUsd,
          score: economics?.economicScore ?? 0,
          volume: economics?.volume ?? 0,
          netAlpha: economics?.netAlpha ?? 0,
          flowDirection: economics?.flowDirection ?? ("neutral" as const),
          sentimentScore: economics?.sentimentScore ?? 0,
        }
      })
      .sort((a, b) => a.netuid - b.netuid)
  }, [subnetTokens, economicsMap, taoUsdPrice, t])

  return subnets
}

export type TaoDashboardSubnet = ReturnType<typeof useTaoDashboardSubnets>[number]

// Hook for loading state
export const useTaoDashboardSubnetsLoading = () => {
  const { isLoading } = useSubnetEconomicsWithSentiment()
  return isLoading
}
