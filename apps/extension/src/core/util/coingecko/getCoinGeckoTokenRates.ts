import { TokenId } from "@talismn/chaindata-provider"
import { NewTokenRates, TokenRates } from "@talismn/token-rates"

const CURRENCIES = Object.keys(NewTokenRates()).join(",")

export const getCoinGeckoTokenRates = async (coingeckoId?: string) => {
  if (!coingeckoId) return null

  try {
    const fetchErc20Coin = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=${CURRENCIES}`
    )
    const rates: Record<TokenId, TokenRates> = await fetchErc20Coin.json()
    return rates[coingeckoId] ?? null
  } catch (err) {
    // most likely invalid id
    return null
  }
}
