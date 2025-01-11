import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useRemoteConfig } from "@ui/state"

import { RampCurrencyWithAssets } from "../types"

// note: currencyCode must be upper case
const fetchRampOfframpAssetsByCurrency = async ({
  currencyCode,
  rampApiBasePath,
}: {
  currencyCode: string | undefined
  rampApiBasePath: string
}): Promise<RampCurrencyWithAssets> => {
  try {
    const apiUrl = currencyCode
      ? `${rampApiBasePath}/offramp/assets?currencyCode=${currencyCode.toUpperCase()}`
      : `${rampApiBasePath}/offramp/assets`
    return await (
      await fetch(apiUrl, {
        method: "GET",
      })
    ).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp offramp assets", { cause })
  }
}

export const useGetRampOfframpAssetsByCurrency = ({
  currencyCode,
  fiatAmount,
  tokenAmount,
  tokenId,
  isEnabled,
}: {
  currencyCode: string | undefined
  fiatAmount: string
  tokenAmount: string
  tokenId: string
  isEnabled: boolean
}) => {
  const {
    rampConfig: { rampApiBasePath },
  } = useRemoteConfig()
  return useQuery({
    queryKey: ["useGetRampOfframpAssets", currencyCode, fiatAmount, tokenAmount, tokenId],
    queryFn: () => fetchRampOfframpAssetsByCurrency({ currencyCode, rampApiBasePath }),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  })
}
