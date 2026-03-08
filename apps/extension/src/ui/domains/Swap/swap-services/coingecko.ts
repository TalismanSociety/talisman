// biome-ignore-all lint/suspicious/noExplicitAny: legacy

import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"

// ─── Cache ──────────────────────────────────────────────────────────

const dataCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = dataCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data as T
  const data = await fetcher()
  dataCache.set(key, { data, timestamp: Date.now() })
  return data
}

// ─── Config ─────────────────────────────────────────────────────────

async function getCoingeckoConfig() {
  const { coingecko } = await remoteConfigStore.get()
  return coingecko
}

// ─── API types ──────────────────────────────────────────────────────

export type CoingeckoAssetPlatform = {
  id: string
  chain_identifier: string | number | null
  name: string
  shortname: string
  native_coin_id: string
}

export type CoingeckoCoin = {
  id: string
  platforms: Record<string, string>
}

export type CoingeckoCategoryItem = {
  symbol: string
  id: string
  image?: string
}

export type CoingeckoCoinDetail = {
  image?: { large: string; small: string; thumb: string }
} | null

// ─── API functions ──────────────────────────────────────────────────

export async function fetchCoingeckoAssetPlatforms(): Promise<CoingeckoAssetPlatform[]> {
  return cachedFetch("coingecko-asset-platforms", async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(`${apiUrl}/api/v3/asset_platforms`, {
      headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    })
    return response.json()
  })
}

export async function fetchCoingeckoList(): Promise<CoingeckoCoin[]> {
  return cachedFetch("coingecko-list", async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(`${apiUrl}/api/v3/coins/list?include_platform=true`, {
      headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    })
    return response.json()
  })
}

export async function fetchCoingeckoCoinsByCategory(
  category: string
): Promise<CoingeckoCategoryItem[]> {
  return cachedFetch(`coingecko-category-${category}`, async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(
      `${apiUrl}/api/v3/coins/markets?vs_currency=usd&category=${category}&include_platform=true`,
      { headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {} }
    )
    return response.json()
  })
}

export async function fetchCoingeckoCoinByAddress(
  address: string,
  platformId: string
): Promise<CoingeckoCoinDetail> {
  return cachedFetch(`coingecko-coin-${address}:${platformId}`, async () => {
    const { apiUrl, apiKeyName, apiKeyValue } = await getCoingeckoConfig()
    const response = await fetch(`${apiUrl}/api/v3/coins/${platformId}/contract/${address}`, {
      headers: apiKeyName && apiKeyValue ? { [apiKeyName]: apiKeyValue } : {},
    })
    return response.json()
  })
}
