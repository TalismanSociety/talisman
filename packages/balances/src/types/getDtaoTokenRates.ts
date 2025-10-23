import { SubDTaoToken, subNativeTokenId } from "@talismn/chaindata-provider"
import {
  newTokenRates,
  TokenRateCurrency,
  TokenRateData,
  TokenRatesList,
} from "@talismn/token-rates"

import { ALPHA_PRICE_SCALE, alphaToTao, TAO_DECIMALS } from "../modules/substrate-dtao/alphaPrice"

const ONE_ALPHA = 10n ** TAO_DECIMALS

export const getDTaoTokenRates = (
  token: SubDTaoToken,
  tokenRates: TokenRatesList,
  scaledAlphaPrice: string | bigint,
) => {
  const taoTokenId = subNativeTokenId(token.networkId)
  const taoTokenRates = tokenRates[taoTokenId]
  if (taoTokenRates === undefined) return null

  // for root subnet, same rates as TAO
  if (token.subnetId === 0) return structuredClone(taoTokenRates)

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
        change24h: undefined, // cannot be determined from TAO rates alone
      }
    }
  }

  return alphaRates
}
