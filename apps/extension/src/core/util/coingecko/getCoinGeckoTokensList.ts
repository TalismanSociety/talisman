export type CoinGeckoTokenInfo = {
  id: string
  symbol: string
  name: string
  platforms?: Record<string, string> // platform_name / contract_address
}

export const getCoinGeckoTokensList = async (includePlatform?: boolean) => {
  const fetchErc20Coin = await fetch(
    `https://api.coingecko.com/api/v3/coins/list?include_platform=${!!includePlatform}`
  )
  return fetchErc20Coin.json() as Promise<CoinGeckoTokenInfo[]>
}
