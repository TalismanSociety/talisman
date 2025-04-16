import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"

import { RampCurrencyWithAssets } from "../../Buy/types"
import { getRampApiUrl } from "./getRampApiUrl"

// note: currencyCode must be upper case
const fetchRampOnrampAssetsByCurrency = async (
  currencyCode: string,
): Promise<RampCurrencyWithAssets> => {
  const apiUrl = await getRampApiUrl(`/assets?currencyCode=${currencyCode.toUpperCase()}`)

  const response = await fetch(apiUrl)
  if (!response.ok) {
    log.error("Failed to fetch Ramp assets", response.status, response.statusText)
    throw new Error("Failed to fetch Ramp assets")
  }

  return await response.json()
}

export const useRampBuyAssetsByCurrency = (currencyCode: string | undefined) => {
  return useQuery({
    queryKey: ["useRampBuyAssetsByCurrency", currencyCode],
    queryFn: () => {
      if (!currencyCode) return null
      return fetchRampOnrampAssetsByCurrency(currencyCode)
    },
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  })
}
