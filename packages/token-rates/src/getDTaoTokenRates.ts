import { type SubDTaoToken, subNativeTokenId } from "@talismn/chaindata-provider"

import log from "./log"
import {
  newTokenRates,
  type TokenRateCurrency,
  type TokenRateData,
  type TokenRatesList,
} from "./types"

/** TAO-per-alpha pool price fixed-point scale: 10^9 (TAO decimals) */
const SCALED_ALPHA_PRICE_SCALE = 10 ** 9

/**
 * 24h change of an alpha token in a given currency, in percent: the pool price change (alpha vs
 * TAO) compounded with the TAO change in that currency. Unknown without the pool change.
 */
const getAlphaChange24h = (
  currency: TokenRateCurrency,
  taoChange24h: number | null | undefined,
  alphaPriceChange24h: number | null | undefined
): number | undefined => {
  if (typeof alphaPriceChange24h !== "number" || !Number.isFinite(alphaPriceChange24h))
    return undefined

  // TAO itself doesn't move against the tao currency: the alpha change is the pool change
  if (currency === "tao") return alphaPriceChange24h

  if (typeof taoChange24h !== "number" || !Number.isFinite(taoChange24h)) return undefined
  return ((1 + alphaPriceChange24h / 100) * (1 + taoChange24h / 100) - 1) * 100
}

/**
 * Rates of a bittensor dtao (subnet alpha) token, derived from its network's native TAO rates
 * scaled by the subnet pool price. To be used for tokens that don't have a coingecko id.
 *
 * @param token
 * @param tokenRates must contain the rates of the network's native (TAO) token
 * @param scaledAlphaPrice current TAO-per-alpha pool price, fixed-point scaled by 10^9 (rao)
 * @param alphaPriceChange24h 24h change of the pool price (alpha vs TAO) in percent, when known
 */
export const getDTaoTokenRates = (
  token: SubDTaoToken,
  tokenRates: TokenRatesList,
  scaledAlphaPrice: string | bigint,
  alphaPriceChange24h?: number | null
) => {
  try {
    const taoTokenId = subNativeTokenId(token.networkId)
    const taoTokenRates = tokenRates[taoTokenId]
    if (!taoTokenRates) return null

    // for root subnet, same rates as TAO
    if (token.netuid === 0) return structuredClone(taoTokenRates)

    const priceRatio = Number(BigInt(scaledAlphaPrice)) / SCALED_ALPHA_PRICE_SCALE

    const alphaRates = newTokenRates()
    for (const [currency, taoRate] of Object.entries(taoTokenRates) as [
      TokenRateCurrency,
      TokenRateData | null,
    ][]) {
      if (!taoRate) {
        alphaRates[currency] = null
      } else {
        alphaRates[currency] = {
          price: taoRate.price * priceRatio,
          marketCap: taoRate.marketCap ? taoRate.marketCap * priceRatio : undefined,
          change24h: getAlphaChange24h(currency, taoRate.change24h, alphaPriceChange24h),
        }
      }
    }

    return alphaRates
  } catch (err) {
    log.error("Failed to compute dtao token rates", err)
    return null
  }
}
