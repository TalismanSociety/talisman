import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"

// ─── Config ─────────────────────────────────────────────────────────

async function getCoingeckoConfig() {
  const { coingecko } = await remoteConfigStore.get()
  return coingecko
}

// ─── API types ──────────────────────────────────────────────────────

export type CoingeckoCategoryItem = {
  symbol: string
  id: string
  image?: string
}

// ─── API functions ──────────────────────────────────────────────────

async function fetchCoingeckoJson<T>(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(url, { headers, signal })
  if (!response.ok)
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
  return response.json()
}

export async function fetchCoingeckoCoinsByCategory(
  category: string,
  signal?: AbortSignal
): Promise<CoingeckoCategoryItem[]> {
  const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
  return fetchCoingeckoJson(
    `${apiUrl}/api/v3/coins/markets?category=${category}`,
    apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    signal
  )
}
