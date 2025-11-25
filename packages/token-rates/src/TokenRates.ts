import { evmErc20TokenId, Token, TokenId } from "@talismn/chaindata-provider"

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

export const ALL_CURRENCY_IDS = Object.keys(SUPPORTED_CURRENCIES) as TokenRateCurrency[]
export type CoinsApiConfig = {
  apiUrl: string
}

export const DEFAULT_COINSAPI_CONFIG: CoinsApiConfig = {
  apiUrl: "https://coins.talisman.xyz",
}
export async function fetchTokenRates(
  tokens: Record<TokenId, Token>,
  currencyIds: TokenRateCurrency[] = ALL_CURRENCY_IDS,
  config: CoinsApiConfig = DEFAULT_COINSAPI_CONFIG,
): Promise<TokenRatesList> {
  // create a map from `coingeckoId` -> `tokenId` for each token
  const coingeckoIdToTokenIds = Object.values(tokens)
    .flatMap((token) => {
      // BEGIN: LP tokens have a rate which is calculated later on, using the rates of two other tokens.
      //
      // This section contains the logic such that: if token is an LP token, then fetch the rates for the two underlying tokens.
      if (token.type === "evm-uniswapv2") {
        if (token.platform !== "ethereum") return []

        const getToken = (
          evmNetworkId: string,
          tokenAddress: `0x${string}`,
          coingeckoId: string,
        ) => ({
          id: evmErc20TokenId(evmNetworkId, tokenAddress),
          coingeckoId,
        })

        const token0 = token.coingeckoId0
          ? [getToken(token.networkId, token.tokenAddress0, token.coingeckoId0)]
          : []
        const token1 = token.coingeckoId1
          ? [getToken(token.networkId, token.tokenAddress1, token.coingeckoId1)]
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

  // If `currencyIds` includes `tao`, we need to always fetch the `bittensor` coingeckoId and the `usd` currency,
  // we can use these to calculate the currency rate for TAO relative to all other tokens.
  //
  // We support showing balances in TAO just like we support BTC/ETH/DOT, but coingecko doesn't support TAO as a vs currency rate.
  // We can macgyver our own TOKEN<>TAO rate by combining the TOKEN<>USD data with the TAO<>USD data.
  const hasVsTao = currencyIds.includes("tao")
  const [effectiveCoingeckoIds, effectiveCurrencyIds] = hasVsTao
    ? [
        [...new Set(coingeckoIds).add("bittensor")],
        [
          ...new Set(
            // don't request `tao` from coingecko (we calculate it from `usd`)
            currencyIds.filter((c) => c !== "tao"),
          )
            // always include `usd` (so we can calculate `tao`)
            .add("usd"),
        ],
      ]
    : [coingeckoIds, currencyIds]

  const response = await fetch(`${config.apiUrl}/token-rates`, {
    method: "POST",
    body: JSON.stringify({
      coingeckoIds: effectiveCoingeckoIds,
      currencyIds: effectiveCurrencyIds,
    }),
  })

  const rawTokenRates: RawTokenRates = await response.json()

  if (hasVsTao) {
    // calculate the TAO<>USD rate
    const effectiveTaoIndex = effectiveCoingeckoIds.indexOf("bittensor")
    const effectiveUsdIndex = effectiveCurrencyIds.indexOf("usd")
    const taoUsdRate = rawTokenRates[effectiveTaoIndex]?.[effectiveUsdIndex]?.[0]
    const taoUsdChange24h = rawTokenRates[effectiveTaoIndex]?.[effectiveUsdIndex]?.[2]

    // insert TOKEN<>TAO rate (calculated based on TAO<>USD rate and TOKEN<>USD rate) into each TOKEN
    const taoIndex = currencyIds.indexOf("tao")
    rawTokenRates.forEach((rates, i) => {
      // hardcoded rate for TAO<>TAO
      if (i === effectiveTaoIndex) {
        rates?.splice(taoIndex, 0, [1, null, null])
        return
      }

      // get TOKEN<>USD rate
      const tokenUsdRate = rates?.[effectiveUsdIndex]?.[0]
      // calculate TOKEN<>TAO rate
      const tokenTaoRate =
        typeof tokenUsdRate === "number" && typeof taoUsdRate === "number" && taoUsdRate !== 0
          ? tokenUsdRate / taoUsdRate
          : null

      const tokenUsdChange24h = rates?.[effectiveUsdIndex]?.[2]
      const tokenTaoChange24h =
        typeof taoUsdChange24h === "number" && typeof tokenUsdChange24h === "number"
          ? (1 + tokenUsdChange24h) / (1 + taoUsdChange24h) - 1
          : null

      // insert at the correct location (based on the index of `tao` in `currencyIds`)
      rates?.splice(taoIndex, 0, [tokenTaoRate, null, tokenTaoChange24h])
    })
  }

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
