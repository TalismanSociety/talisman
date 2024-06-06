import { Token, TokenId } from "@talismn/chaindata-provider"
import axios from "axios"

import { NewTokenRates, SUPPORTED_CURRENCIES, TokenRateCurrency, TokenRatesList } from "./types"

// every currency in this list will be fetched from coingecko
// comment out unused currencies to save some bandwidth!
const coingeckoCurrencies = Object.keys(SUPPORTED_CURRENCIES) as TokenRateCurrency[]

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
  tokens: Record<TokenId, Token>,
  config: CoingeckoConfig = DEFAULT_COINGECKO_CONFIG
): Promise<TokenRatesList> {
  // create a map from `coingeckoId` -> `tokenId` for each token
  const coingeckoIdToTokenIds = Object.values(tokens)
    // ignore testnet tokens
    .filter(({ isTestnet }) => !isTestnet)

    .flatMap((token) => {
      // BEGIN: LP tokens have a rate which is calculated later on, using the rates of two other tokens.
      //
      // This section contains the logic such that: if token is an LP token, then fetch the rates for the two underlying tokens.
      if (token.type === "evm-uniswapv2") {
        if (!token.evmNetwork) return []

        const getToken = (evmNetworkId: string, tokenAddress: string, coingeckoId: string) => ({
          id: evmErc20TokenId(evmNetworkId, tokenAddress),
          coingeckoId,
        })

        const token0 = token.coingeckoId0
          ? [getToken(token.evmNetwork.id, token.tokenAddress0, token.coingeckoId0)]
          : []
        const token1 = token.coingeckoId1
          ? [getToken(token.evmNetwork.id, token.tokenAddress1, token.coingeckoId1)]
          : []

        return [...token0, ...token1]
      }
      // END: LP tokens have a rate which is calculated later on, using the rates of two other tokens.

      // ignore tokens which don't have a coingeckoId
      if (!token.coingeckoId) return []

      return [{ id: token.id, coingeckoId: token.coingeckoId }]
    })

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

// TODO: Move this into a common module which can then be imported both here and into EvmErc20Module
// We can't import this directly from EvmErc20Module because this package doesn't depend on `@talismn/balances`
const evmErc20TokenId = (chainId: string, tokenContractAddress: string) =>
  `${chainId}-evm-erc20-${tokenContractAddress}`.toLowerCase()
