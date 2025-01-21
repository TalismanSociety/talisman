import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { useRemoteConfig } from "@ui/state"

import { RampCurrencyWithAssets } from "../types"

// note: currencyCode must be upper case
const fetchRampOnrampAssetsByCurrency = async ({
  currencyCode,
  rampApiBasePath,
}: {
  currencyCode: string | undefined
  rampApiBasePath: string
}): Promise<RampCurrencyWithAssets> => {
  try {
    const apiUrl = currencyCode
      ? `${rampApiBasePath}/assets?currencyCode=${currencyCode.toUpperCase()}`
      : `${rampApiBasePath}/assets`

    return await (await fetch(apiUrl)).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp assets", { cause })
  }
}

export const useGetRampOnrampAssetsByCurrency = ({
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
    queryKey: ["useGetRampOnrampAssets", currencyCode, fiatAmount, tokenAmount, tokenId],
    queryFn: () => fetchRampOnrampAssetsByCurrency({ currencyCode, rampApiBasePath }),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  })
}
