import { fetchFromCoingecko } from "./fetchFromCoingecko"

export type CoinGeckoTokenInfo = {
  id: string
  symbol: string
  name: string
  platforms?: Record<string, string> // platform_name / contract_address
}

export const getCoingeckoTokensList = async (includePlatform?: boolean) => {
  const fetchErc20Coin = await fetchFromCoingecko(
    `/api/v3/coins/list?include_platform=${!!includePlatform}`
  )
  return fetchErc20Coin.json() as Promise<CoinGeckoTokenInfo[]>
}
