import { CoingeckoConfig, DEFAULT_COINGECKO_CONFIG } from "@talismn/token-rates"
import { useMemo } from "react"

import { provideContext } from "../util/provideContext"

function useCoingeckoConfigProvider(options: Partial<CoingeckoConfig> = {}) {
  const apiUrl = options.apiUrl ?? DEFAULT_COINGECKO_CONFIG.apiUrl
  const apiKeyName = options.apiKeyName ?? DEFAULT_COINGECKO_CONFIG.apiKeyName
  const apiKeyValue = options.apiKeyValue ?? DEFAULT_COINGECKO_CONFIG.apiKeyValue

  return useMemo(
    (): CoingeckoConfig => ({ apiUrl, apiKeyName, apiKeyValue }),
    [apiUrl, apiKeyName, apiKeyValue]
  )
}

export const [CoingeckoConfigProvider, useCoingeckoConfig] = provideContext(
  useCoingeckoConfigProvider
)
