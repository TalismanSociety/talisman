import { Token, TokenId } from "@talismn/chaindata-provider"

import { NewTokenRates, SUPPORTED_CURRENCIES, TokenRateCurrency, TokenRatesList } from "./types"

export class TokenRatesError extends Error {
  response?: Response
  constructor(message: string, response?: Response) {
    super(message)
    this.response = response
  }
}

// every currency in this list will be fetched from coingecko
// comment out unused currencies to save some bandwidth!
const coingeckoCurrencies = Object.keys(SUPPORTED_CURRENCIES) as TokenRateCurrency[]

export type CoingeckoConfig = {
  apiUrl: string
  apiKeyName?: string
  apiKeyValue?: string
}

// api returns a 414 error if the url is too long, max length is about 8100 characters
// so use 8000 to be safe
const MAX_COINGECKO_URL_LENGTH = 8000

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
  const coingeckoIds = Object.keys(coingeckoIdToTokenIds).sort()

  // skip network request if there is nothing for us to fetch
  if (coingeckoIds.length < 1) return {}

  // construct a coingecko request, sort args to help proxies with caching

  const currenciesSerialized = coingeckoCurrencies.sort().join(",")

  const safelyGetCoingeckoUrls = (coingeckoIds: string[]): string[] => {
    const idsSerialized = coingeckoIds.join(",")
    const queryUrl = `${config.apiUrl}/api/v3/simple/price?ids=${idsSerialized}&vs_currencies=${currenciesSerialized}`
    if (queryUrl.length > MAX_COINGECKO_URL_LENGTH) {
      const half = Math.floor(coingeckoIds.length / 2)
      return [
        ...safelyGetCoingeckoUrls(coingeckoIds.slice(0, half)),
        ...safelyGetCoingeckoUrls(coingeckoIds.slice(half)),
      ]
    }
    return [queryUrl]
  }

  // fetch the token prices from coingecko
  // the response should be in the format:
  // {
  //   [coingeckoId]: {
  //     [currency]: rate
  //   }
  // }

  const coingeckoHeaders = new Headers()
  if (config.apiKeyName && config.apiKeyValue) {
    coingeckoHeaders.set(config.apiKeyName, config.apiKeyValue)
  }

  const coingeckoPrices = await Promise.all(
    safelyGetCoingeckoUrls(coingeckoIds).map(
      async (queryUrl): Promise<Record<string, Record<string, number>>> =>
        await fetch(queryUrl, { headers: coingeckoHeaders }).then((response) => {
          if (response.status !== 200)
            throw new TokenRatesError(`Failed to fetch token rates`, response)
          return response.json()
        })
    )
  ).then((responses): Record<string, Record<string, number>> => Object.assign({}, ...responses))

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
