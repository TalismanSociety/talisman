import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { RAMP_BASE_PATH } from "extension-shared"

import { RampCurrencyWithAssets } from "../types"

// note: currencyCode must be upper case
const fetchRampAssetsByCurrency = async (currencyCode: string): Promise<RampCurrencyWithAssets> => {
  try {
    return await (
      await fetch(`${RAMP_BASE_PATH}/assets?currencyCode=${currencyCode.toUpperCase()}`, {
        method: "GET",
      })
    ).json()
  } catch (cause) {
    throw new Error("Failed to fetch Ramp assets", { cause })
  }
}

export const useGetRampAssetsByCurrency = ({
  currencyCode,
  fiatAmount,
  tokenAmount,
  tokenId,
}: {
  currencyCode: string
  fiatAmount: string
  tokenAmount: string
  tokenId: string
}) => {
  return useQuery({
    queryKey: ["useGetRampAssets", currencyCode, fiatAmount, tokenAmount, tokenId],
    queryFn: () => fetchRampAssetsByCurrency(currencyCode),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  })
}
