import { fetchFromCoingecko } from "@extension/core"
import { TokenId } from "@talismn/chaindata-provider"
import { NewTokenRates, TokenRates } from "@talismn/token-rates"
import { useQuery } from "@tanstack/react-query"

const CURRENCIES = Object.keys(NewTokenRates()).join(",")

const getCoinGeckoTokenRates = async (coingeckoId?: string) => {
  if (!coingeckoId) return null

  try {
    const fetchErc20Coin = await fetchFromCoingecko(
      `/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=${CURRENCIES}`
    )
    const rates: Record<TokenId, TokenRates> = await fetchErc20Coin.json()
    return rates[coingeckoId] ?? null
  } catch (err) {
    // most likely invalid id
    return null
  }
}

export const useCoinGeckoTokenRates = (coingeckoId?: string) => {
  return useQuery({
    queryKey: ["useCoinGeckoTokenRates", coingeckoId],
    refetchInterval: 300_000, // 5 mins
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: () => getCoinGeckoTokenRates(coingeckoId),
  })
}
