import { IToken, TokenId } from "@talismn/chaindata-provider"
import axios from "axios"

import { NewTokenRates, TokenRates, TokenRatesList } from "./types"

// every currency in this list will be fetched from coingecko
// comment out unused currencies to save some bandwidth!
const coingeckoCurrencies: Array<keyof TokenRates> = [
  "usd",
  "aud",
  // 'nzd',
  "cad",
  // 'hkd',
  "eur",
  "gbp",
  "jpy",
  // 'krw',
  "cny",
  "rub",
  "btc",
  "eth",
  "dot",
]

export type CoingeckoConfig = {
  apiUrl: string
  apiKeyName?: string
  apiKeyValue?: string
}

export const DEFAULT_COINGECKO_CONFIG: CoingeckoConfig = {
  apiUrl: "https://api.coingecko.com",
}

// export function tokenRates(tokens: WithCoingeckoId[]): TokenRatesList {}
export async function fetchTokenRates(
  tokens: Record<TokenId, IToken>,
  config: CoingeckoConfig = DEFAULT_COINGECKO_CONFIG
): Promise<TokenRatesList> {
  // create a map from `coingeckoId` -> `tokenId` for each token
  const coingeckoIdToTokenIds = Object.values(tokens)
    // ignore testnet tokens
    .filter(({ isTestnet }) => !isTestnet)

    // ignore tokens which don't have a coingeckoId
    .filter(hasCoingeckoId)

    // get each token's coingeckoId
    .reduce((coingeckoIdToTokenIds, { id, coingeckoId }) => {
      if (!coingeckoIdToTokenIds[coingeckoId]) coingeckoIdToTokenIds[coingeckoId] = []
      coingeckoIdToTokenIds[coingeckoId].push(id)
      return coingeckoIdToTokenIds
    }, {} as Record<string, string[]>)

  // create a list of coingeckoIds we want to fetch
  const coingeckoIds = Object.keys(coingeckoIdToTokenIds)

  // skip network request if there is nothing for us to fetch
  if (coingeckoIds.length < 1) return {}

  // construct a coingecko request, sort args to help proxies with caching
  const idsSerialized = coingeckoIds.sort().join(",")
  const currenciesSerialized = coingeckoCurrencies.sort().join(",")
  // note: coingecko api key cannot be passed as header here as it would be camel cased by axios and ignored by the server
  // need to pass it as a query parameter, and replace all '-' with '_'
  // TODO => migrate to fetch api
  const apiKeySuffix =
    config.apiKeyName && config.apiKeyValue
      ? `&${config.apiKeyName?.replaceAll("-", "_")}=${config.apiKeyValue}`
      : ""
  const queryUrl = `${config.apiUrl}/api/v3/simple/price?ids=${idsSerialized}&vs_currencies=${currenciesSerialized}${apiKeySuffix}`

  // fetch the token prices from coingecko
  // the response should be in the format:
  // {
  //   [coingeckoId]: {
  //     [currency]: rate
  //   }
  // }
  const coingeckoPrices: Record<string, Record<string, number>> = await axios
    .get(queryUrl)
    .then((response) => response.data)

  // build a TokenRatesList from the token prices result
  const ratesList: TokenRatesList = Object.fromEntries(
    coingeckoIds.flatMap((coingeckoId) => {
      const tokenIds = coingeckoIdToTokenIds[coingeckoId]
      const rates = NewTokenRates()

      for (const currency of coingeckoCurrencies) {
        rates[currency] = ((coingeckoPrices || {})[coingeckoId] || {})[currency] || null
      }

      return tokenIds.map((tokenId) => [tokenId, rates])
    })
  )

  // return the TokenRatesList
  return ratesList
}

export interface WithCoingeckoId {
  coingeckoId: string
}
export function hasCoingeckoId(token: IToken): token is IToken & WithCoingeckoId {
  return "coingeckoId" in token && typeof token.coingeckoId === "string"
}
