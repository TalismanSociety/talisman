import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { RAMP_API_BASE_PATH } from "extension-shared"

import { RampCurrencyWithAssets } from "../types"

// note: currencyCode must be upper case
const fetchRampOfframpAssetsByCurrency = async (
  currencyCode: string,
): Promise<RampCurrencyWithAssets> => {
  try {
    return await (
      await fetch(
        `${RAMP_API_BASE_PATH}/offramp/assets?currencyCode=${currencyCode.toUpperCase()}`,
        {
          method: "GET",
        },
      )
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
  currencyCode: string
  fiatAmount: string
  tokenAmount: string
  tokenId: string
  isEnabled: boolean
}) => {
  return useQuery({
    queryKey: ["useGetRampOfframpAssets", currencyCode, fiatAmount, tokenAmount, tokenId],
    queryFn: () => fetchRampOfframpAssetsByCurrency(currencyCode),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  })
}
