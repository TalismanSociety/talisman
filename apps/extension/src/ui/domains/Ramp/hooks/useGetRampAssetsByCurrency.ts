import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { RAMP_API_BASE_PATH } from "extension-shared"

import { RampCurrencyWithAssets } from "../types"

// note: currencyCode must be upper case
const fetchRampAssetsByCurrency = async (
  currencyCode: string | undefined,
): Promise<RampCurrencyWithAssets> => {
  try {
    const apiUrl = currencyCode
      ? `${RAMP_API_BASE_PATH}/assets?currencyCode=${currencyCode.toUpperCase()}`
      : `${RAMP_API_BASE_PATH}/assets`

    return await (await fetch(apiUrl)).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp assets", { cause })
  }
}

export const useGetRampAssetsByCurrency = ({
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
  return useQuery({
    queryKey: ["useGetRampAssets", currencyCode, fiatAmount, tokenAmount, tokenId],
    queryFn: () => fetchRampAssetsByCurrency(currencyCode),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
    enabled: isEnabled,
  })
}
