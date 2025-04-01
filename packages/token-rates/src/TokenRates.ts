import { Token, TokenId } from "@talismn/chaindata-provider"

import {
  SUPPORTED_CURRENCIES,
  TokenRateCurrency,
  TokenRateData,
  TokenRates,
  TokenRatesList,
} from "./types"

export class TokenRatesError extends Error {
  response?: Response
  constructor(message: string, response?: Response) {
    super(message)
    this.response = response
  }
}

const ALL_CURRENCY_IDS = Object.keys(SUPPORTED_CURRENCIES) as TokenRateCurrency[]
export type CoinsApiConfig = {
  apiUrl: string
}

export const DEFAULT_COINAPI_CONFIG: CoinsApiConfig = {
  apiUrl: "https://coins.talisman.xyz",
}
export async function fetchTokenRates(
  tokens: Record<TokenId, Token>,
  currencyIds: TokenRateCurrency[] = ALL_CURRENCY_IDS,
  config: CoinsApiConfig = DEFAULT_COINAPI_CONFIG,
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
    .reduce(
      (coingeckoIdToTokenIds, { id, coingeckoId }) => {
        if (!coingeckoIdToTokenIds[coingeckoId]) coingeckoIdToTokenIds[coingeckoId] = []
        coingeckoIdToTokenIds[coingeckoId].push(id)
        return coingeckoIdToTokenIds
      },
      {} as Record<string, string[]>,
    )

  // create a list of coingeckoIds we want to fetch
  const coingeckoIds = Object.keys(coingeckoIdToTokenIds).sort()

  // skip network request if there is nothing for us to fetch
  if (coingeckoIds.length < 1) return {}

  const response = await fetch(`${config.apiUrl}/token-rates`, {
    method: "POST",
    body: JSON.stringify({ coingeckoIds, currencyIds }),
  })

  const rawTokenRates = await response.json()

  const tokenRates = parseTokenRatesFromApi(rawTokenRates, coingeckoIds, currencyIds)

  // build a TokenRatesList from the token prices result
  const ratesList: TokenRatesList = Object.fromEntries(
    Object.entries(tokens).map(([tokenId, token]) => [
      tokenId,
      token.coingeckoId ? (tokenRates[token.coingeckoId] ?? null) : null,
    ]),
  ) as TokenRatesList

  return ratesList
}

// TODO: Move this into a common module which can then be imported both here and into EvmErc20Module
// We can't import this directly from EvmErc20Module because this package doesn't depend on `@talismn/balances`
const evmErc20TokenId = (chainId: string, tokenContractAddress: string) =>
  `${chainId}-evm-erc20-${tokenContractAddress}`.toLowerCase()

// To save on bandwidth and work around response size limits, values are returned without json property names
// (e.g. [[[12, 12332, 0.5]]] instead of { dot : {usd: { value: 12, marketCap: 12332, change24h: 0.5 }} })
type RawTokenRates = [number | null, number | null, number | null][][]

const parseTokenRatesFromApi = (
  rawTokenRates: RawTokenRates,
  coingeckoIds: string[],
  currencyIds: TokenRateCurrency[],
): TokenRatesList => {
  return Object.fromEntries(
    coingeckoIds.map((coingeckoId, idx) => {
      const rates = rawTokenRates[idx]
      if (!rates) return [coingeckoId, null]

      return [
        coingeckoId,
        Object.fromEntries(
          currencyIds.map((currencyId, idx) => {
            const curRate = rates[idx]
            if (!curRate) return [currencyId, null]

            const [price, marketCap, change24h] = rates[idx]
            return [currencyId, { price, marketCap, change24h } as TokenRateData]
          }),
        ) as TokenRates,
      ]
    }),
  ) as TokenRatesList
}
