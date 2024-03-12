import { fetchFromCoingecko } from "@extension/core/util/coingecko/fetchFromCoingecko"
import { log } from "@extension/shared"

type CoinGeckoAssetPlatform = {
  id: string
  chain_identifier: number
  name: string
  shortname: string
}

export type CoinGeckoErc20Coin = {
  id: string
  symbol: string
  name: string
  asset_platform_id: string
  contract_address: string
  image: {
    thumb: string
    small: string
    large: string
  }
}

type CoinGeckoAssetPlatformCache = {
  data: CoinGeckoAssetPlatform[]
  fetched: number | undefined
}

const assetPlatformCache: CoinGeckoAssetPlatformCache = {
  data: [],
  fetched: undefined,
}

const ASSETPLATFORM_CACHE_TIMEOUT = 10 * 60 * 1000 // 10 minutes

const getCoinGeckoAssetPlatform = async (assetPlatformId: string) => {
  if (
    !assetPlatformCache.fetched ||
    assetPlatformCache.fetched + ASSETPLATFORM_CACHE_TIMEOUT < Date.now()
  ) {
    try {
      const fetchAssetPlaforms = await fetchFromCoingecko("/api/v3/asset_platforms")
      if (fetchAssetPlaforms.ok) {
        assetPlatformCache.data = await fetchAssetPlaforms.json()
        assetPlatformCache.fetched = Date.now()
      }
    } catch (error) {
      log.error("Unable to fetch coingecko asset platforms ", { error })
    }
  }

  if (!assetPlatformCache.data || assetPlatformCache.data.length === 0) return null

  return (
    assetPlatformCache.data.find(({ id, chain_identifier }) =>
      [id, chain_identifier?.toString()].filter(Boolean).includes(assetPlatformId)
    ) ?? null
  )
}

export const getCoinGeckoErc20Coin = async (
  assetPlatformId: string,
  contractAddress: string
): Promise<CoinGeckoErc20Coin | null> => {
  const assetPlatform = await getCoinGeckoAssetPlatform(assetPlatformId)
  if (!assetPlatform) return null

  try {
    const fetchErc20Coin = await fetchFromCoingecko(
      `/api/v3/coins/${assetPlatform.id}/contract/${contractAddress.toLowerCase()}`
    )
    const res = await fetchErc20Coin.json()

    // if coin is not found, it's stated in the response's json
    if (res.error) throw new Error(res.error)

    return res
  } catch (error) {
    log.error("Can't fetch erc20 coingecko details", { error })
    return null
  }
}
