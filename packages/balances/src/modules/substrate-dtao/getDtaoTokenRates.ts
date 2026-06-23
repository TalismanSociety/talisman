import { type SubDTaoToken, subNativeTokenId } from "@talismn/chaindata-provider"
import {
  newTokenRates,
  type TokenRateCurrency,
  type TokenRateData,
  type TokenRatesList,
} from "@talismn/token-rates"

import log from "../../log"
import { ALPHA_PRICE_SCALE, alphaToTao, TAO_DECIMALS } from "./alphaPrice"

const ONE_ALPHA = 10n ** TAO_DECIMALS

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
 * To be used for tokens that don't have a coingecko id
 *
 * @param token
 * @param tokenRates
 * @param scaledAlphaPrice
 * @param alphaPriceChange24h 24h change of the pool price (alpha vs TAO) in percent, when known
 * @returns
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

    const alphaRates = newTokenRates()
    for (const [currency, taoRate] of Object.entries(taoTokenRates) as [
      TokenRateCurrency,
      TokenRateData | null,
    ][]) {
      if (!taoRate) {
        alphaRates[currency] = null
      } else {
        const taoPrice = alphaToTao(ONE_ALPHA, BigInt(scaledAlphaPrice))
        const priceRatio = Number(taoPrice) / Number(ALPHA_PRICE_SCALE)
        alphaRates[currency] = {
          price: taoRate.price * priceRatio,
          marketCap: taoRate.marketCap ? taoRate.marketCap * priceRatio : undefined,
          change24h: getAlphaChange24h(currency, taoRate.change24h, alphaPriceChange24h),
        }
      }
    }

    return alphaRates
  } catch (err) {
    log.error(err)
    return null
  }
}
