import { log } from "@common/log"
import type { SubDTaoToken, TokenList } from "@talismn/chaindata-provider"
import { getDTaoTokenRates, type TokenRatesList } from "@talismn/token-rates"
import { Struct, u16, u64, Vector } from "scale-ts"

import { chainConnector } from "../../rpcs/chain-connector"
import { chaindataProvider } from "../../rpcs/chaindata"
import { activeNetworksStore, isNetworkActive } from "../balances/store.activeNetworks"
import { BITTENSOR_NETWORK_ID } from "../bittensor/constants"
import { getTaoDataApi } from "../bittensor/tao-data/exports"
import { gandalfFetch } from "../gandalf/fetch"

// decoded shape of the SwapRuntimeApi_current_alpha_price_all result
const alphaPricesCodec = Vector(Struct({ netuid: u16, price: u64 }))

/** Current TAO-per-alpha pool price of every subnet, keyed by netuid, in the scaledAlphaPrice fixed-point format (rao) */
const fetchScaledAlphaPricesByNetuid = async (): Promise<Map<number, bigint>> => {
  const result = await chainConnector.send<string>(BITTENSOR_NETWORK_ID, "state_call", [
    "SwapRuntimeApi_current_alpha_price_all",
    "0x",
  ])
  return new Map(alphaPricesCodec.dec(result).map(({ netuid, price }) => [netuid, price]))
}

const taoDataApi = getTaoDataApi(gandalfFetch)

const ALPHA_PRICE_CHANGES_TTL = 5 * 60_000
let alphaPriceChangesCache: { fetchedAt: number; changes: Map<number, number> } | null = null

/**
 * 24h percent change of every subnet pool price (alpha vs TAO) from the tao-data api — the
 * chain knows the current pool prices but not yesterday's. 5-min in-memory cache; failure is
 * non-fatal (stale cache when available, else no change24h on the computed rates).
 */
const getAlphaPriceChangesByNetuid = async (): Promise<Map<number, number> | null> => {
  if (
    alphaPriceChangesCache &&
    performance.now() - alphaPriceChangesCache.fetchedAt < ALPHA_PRICE_CHANGES_TTL
  )
    return alphaPriceChangesCache.changes

  try {
    const response = await taoDataApi.pools.listPools()
    const changes = new Map(
      response.data
        .map((pool): [number, number] => [pool.netuid, Number(pool.price_change_1_day)])
        .filter(([, change]) => Number.isFinite(change))
    )
    alphaPriceChangesCache = { fetchedAt: performance.now(), changes }
    return changes
  } catch (err) {
    log.warn("[tokenRates] failed to fetch alpha price 24h changes", { err })
    return alphaPriceChangesCache?.changes ?? null
  }
}

/**
 * Rates entries for the bittensor dtao (subnet alpha) tokens of `tokens`, priced from their
 * subnet pool combined with the TAO rates in `coingeckoRates`. On chain-fetch failure, falls
 * back to the token's entry in `previousRates` (keep-last). Never throws — a dtao pricing
 * failure must not discard the coingecko rates it gets merged into.
 */
export const fetchDTaoTokenRates = async (
  tokens: TokenList,
  coingeckoRates: TokenRatesList,
  previousRates: TokenRatesList
): Promise<TokenRatesList> => {
  const dtaoTokens = Object.values(tokens).filter(
    (token): token is SubDTaoToken =>
      token.type === "substrate-dtao" &&
      token.networkId === BITTENSOR_NETWORK_ID &&
      !token.coingeckoId
  )
  if (!dtaoTokens.length) return {}

  // dtao template tokens are isDefault (always in the active-token list), so gate on the
  // NETWORK's active state too — no bittensor RPC when the user has the network disabled
  const [network, activeNetworks] = await Promise.all([
    chaindataProvider.getNetworkById(BITTENSOR_NETWORK_ID),
    activeNetworksStore.get(),
  ])
  if (!network || !isNetworkActive(network, activeNetworks)) return {}

  const keepLast = () =>
    Object.fromEntries(
      dtaoTokens
        .filter((token) => previousRates[token.id])
        .map((token) => [token.id, previousRates[token.id]])
    )

  let prices: Map<number, bigint>
  try {
    prices = await fetchScaledAlphaPricesByNetuid()
  } catch (err) {
    log.warn("[tokenRates] failed to fetch alpha prices, keeping previous dtao rates", { err })
    return keepLast()
  }

  const changes = await getAlphaPriceChangesByNetuid()

  return Object.fromEntries(
    dtaoTokens
      .map((token) => {
        // never fabricate a zero price: a netuid missing from the result keeps its last rates
        const price = prices.get(token.netuid)
        const rates =
          price !== undefined
            ? getDTaoTokenRates(token, coingeckoRates, price, changes?.get(token.netuid))
            : null
        return [token.id, rates ?? previousRates[token.id]] as const
      })
      .filter(([, rates]) => !!rates)
  )
}
