import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo } from "react"

import { RampsMode } from "../shared/types"
import { getRampApiUrl } from "./getRampApiUrl"
import { RampHostAssetsConfig } from "./types"
import { useRampCurrencies } from "./useRampCurrencies"

const fetchRampAssets = async (
  /** NOTE: currencyCode must be upper case */
  currencyCode: string,
  mode: RampsMode,
): Promise<RampHostAssetsConfig> => {
  const apiUrl = await getRampApiUrl(
    `${mode === "sell" ? "/offramp" : ""}/assets?currencyCode=${currencyCode.toUpperCase()}`,
  )

  const response = await fetch(apiUrl)
  if (!response.ok) {
    log.error("Failed to fetch Ramp assets", response.status, response.statusText)
    throw new Error("Failed to fetch Ramp assets")
  }

  return await response.json()
}

export const useRampTokens = (currencyCode: string | undefined, mode: RampsMode) => {
  const { data: rampCurrencies } = useRampCurrencies()

  const enabled = useMemo(
    () => !!rampCurrencies?.some((c) => c.fiatCurrency === currencyCode),
    [currencyCode, rampCurrencies],
  )

  return useQuery({
    queryKey: ["useRampTokens", currencyCode, mode],
    queryFn: () => {
      if (!currencyCode) return null
      return fetchRampAssets(currencyCode, mode)
    },
    enabled,
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  })
}
