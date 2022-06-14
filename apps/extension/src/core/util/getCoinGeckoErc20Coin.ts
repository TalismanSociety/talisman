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

const getCoinGeckoAssetPlatform = async (assetPlatformId: string | number) => {
  const fetchAssetPlaforms = await fetch("https://api.coingecko.com/api/v3/asset_platforms")
  const assetPlatforms: CoinGeckoAssetPlatform[] = await fetchAssetPlaforms.json()
  return (
    assetPlatforms.find(({ id, chain_identifier }) =>
      [id, chain_identifier].filter(Boolean).includes(assetPlatformId)
    ) ?? null
  )
}

export const getCoinGeckoErc20Coin = async (
  assetPlatformId: string | number,
  contractAddress: string
): Promise<CoinGeckoErc20Coin | null> => {
  const assetPlatform = await getCoinGeckoAssetPlatform(assetPlatformId)
  if (!assetPlatform) return null
  const fetchErc20Coin = await fetch(
    `https://api.coingecko.com/api/v3/coins/${assetPlatform.id}/contract/${contractAddress}`
  )
  return fetchErc20Coin.json()
}
