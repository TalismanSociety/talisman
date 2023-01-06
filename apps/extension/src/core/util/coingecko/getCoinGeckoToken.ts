export type CoinGeckoToken = {
  id: string
  symbol: string
  name: string
  asset_platform_id?: string
  contract_address?: string
  image: {
    thumb: string
    small: string
    large: string
  }
  platforms: Record<string, string>
}

export const getCoinGeckoToken = async (id: string) => {
  try {
    const fetchErc20Coin = await fetch(`https://api.coingecko.com/api/v3/coins/${id}`)
    return fetchErc20Coin.json() as Promise<CoinGeckoToken>
  } catch (err) {
    // most likely invalid id
    return null
  }
}
