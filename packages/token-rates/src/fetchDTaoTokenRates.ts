import type { IChainConnectorDot } from "@talismn/chain-connectors"
import type { NetworkId, SubDTaoToken, TokenList } from "@talismn/chaindata-provider"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { throwAfter } from "@talismn/util"
import { Struct, u16, u64, Vector } from "scale-ts"

import { getDTaoTokenRates } from "./getDTaoTokenRates"
import log from "./log"
import type { TokenRatesList } from "./types"

const DEFAULT_BITTENSOR_NETWORK_ID = "bittensor"
const DEFAULT_TAO_DATA_API_URL = "https://tda.talisman.xyz"
const DEFAULT_TIMEOUT_MS = 10_000

// decoded shape of the SwapRuntimeApi_current_alpha_price_all result
const alphaPricesCodec = Vector(Struct({ netuid: u16, price: u64 }))

/** Current TAO-per-alpha pool price of every subnet, keyed by netuid, in the scaledAlphaPrice fixed-point format (rao) */
const fetchScaledAlphaPricesByNetuid = async (
  connector: IChainConnectorDot,
  networkId: NetworkId
): Promise<Map<number, bigint>> => {
  const result = await connector.send<string>(networkId, "state_call", [
    "SwapRuntimeApi_current_alpha_price_all",
    "0x",
  ])
  return new Map(alphaPricesCodec.dec(result).map(({ netuid, price }) => [netuid, price]))
}

const ALPHA_PRICE_CHANGES_TTL = 5 * 60_000
const alphaPriceChangesCache = new Map<
  string,
  { fetchedAt: number; changes: Map<number, number> }
>()

/**
 * 24h percent change of every subnet pool price (alpha vs TAO) from the tao-data api — the
 * chain knows the current pool prices but not yesterday's. 5-min in-memory cache; failure is
 * non-fatal (stale cache when available, else no change24h on the computed rates).
 */
const getAlphaPriceChangesByNetuid = async (
  apiUrl: string,
  customFetch: typeof fetch,
  timeoutMs: number
): Promise<Map<number, number> | null> => {
  const cached = alphaPriceChangesCache.get(apiUrl)
  if (cached && performance.now() - cached.fetchedAt < ALPHA_PRICE_CHANGES_TTL)
    return cached.changes

  try {
    const response = await customFetch(`${apiUrl}/pools`, {
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    const pools = (await response.json()) as {
      netuid: number
      price_change_1_day: number | string
    }[]
    const changes = new Map(
      pools
        .map((pool): [number, number] => [pool.netuid, Number(pool.price_change_1_day)])
        .filter(([, change]) => Number.isFinite(change))
    )
    alphaPriceChangesCache.set(apiUrl, { fetchedAt: performance.now(), changes })
    return changes
  } catch (err) {
    log.warn("Failed to fetch alpha price 24h changes", err)
    return cached?.changes ?? null
  }
}

export type FetchDTaoTokenRatesOptions = {
  /** substrate chain connector of the host (only its `send` method is used, for one state_call per invocation) */
  connector: IChainConnectorDot
  /** the bittensor network id, defaults to "bittensor" (mainnet) */
  networkId?: NetworkId
  /** token list to price — non-dtao tokens (and dtao tokens with a coingeckoId) are ignored */
  tokens: TokenList
  /** freshly fetched rates list — dtao rates derive from the network's native TAO token rates in it */
  tokenRates: TokenRatesList
  /** previous rates list, used as keep-last fallback when fetching fails */
  previousRates: TokenRatesList
  /** custom fetch for the tao-data api (eg with auth headers), defaults to global fetch */
  customFetch?: typeof fetch
  /** tao-data api url, defaults to https://tda.talisman.xyz */
  taoDataApiUrl?: string
  /** per-request timeout for the chain call and the tao-data api call, defaults to 10s */
  timeoutMs?: number
}

/**
 * Rates entries for the bittensor dtao (subnet alpha) tokens of `tokens`, priced from their
 * subnet pool combined with the TAO rates in `tokenRates`. On chain-fetch failure, falls
 * back to the token's entry in `previousRates` (keep-last). Never throws — a dtao pricing
 * failure must not discard the rates list it gets merged into.
 *
 * Hosts remain responsible for WHEN to call this (network enabled state, refresh cadence)
 * and for merging the result into their rates list/store.
 */
export const fetchDTaoTokenRates = async ({
  connector,
  networkId = DEFAULT_BITTENSOR_NETWORK_ID,
  tokens,
  tokenRates,
  previousRates,
  customFetch = fetch,
  taoDataApiUrl = DEFAULT_TAO_DATA_API_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: FetchDTaoTokenRatesOptions): Promise<TokenRatesList> => {
  const dtaoTokens = Object.values(tokens).filter(
    (token): token is SubDTaoToken =>
      token.type === "substrate-dtao" && token.networkId === networkId && !token.coingeckoId
  )
  if (!dtaoTokens.length) return {}

  // alpha rates derive from the network's native TAO rates: without them there is nothing to
  // price against, and keep-last must not apply (stale entries would display as current)
  if (!tokenRates[subNativeTokenId(networkId)]) return {}

  // the two fetches are independent: run them concurrently
  const [prices, changes] = await Promise.all([
    Promise.race([
      fetchScaledAlphaPricesByNetuid(connector, networkId),
      throwAfter(timeoutMs, `Timed out after ${timeoutMs}ms`),
    ]).catch((err) => {
      log.warn("Failed to fetch alpha prices, keeping previous dtao rates", err)
      return null
    }),
    getAlphaPriceChangesByNetuid(taoDataApiUrl, customFetch, timeoutMs),
  ])

  if (!prices)
    return Object.fromEntries(
      dtaoTokens
        .filter((token) => previousRates[token.id])
        .map((token) => [token.id, previousRates[token.id]])
    )

  return Object.fromEntries(
    dtaoTokens
      .map((token) => {
        // never fabricate a zero price: a missing or zero pool price keeps the last rates
        const price = prices.get(token.netuid)
        const rates = price
          ? getDTaoTokenRates(token, tokenRates, price, changes?.get(token.netuid))
          : null
        return [token.id, rates ?? previousRates[token.id]] as const
      })
      .filter(([, rates]) => !!rates)
  )
}
