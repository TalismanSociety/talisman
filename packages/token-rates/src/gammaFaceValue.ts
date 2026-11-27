import type { TokenId } from "@talismn/chaindata-provider"

import type { TokenRateCurrency, TokenRatesList } from "./types"

/** The value of one gamma credit at face. A separate type from rates, so it cannot be stored as one. */
export type GammaFaceValue = {
  readonly kind: "gamma-face-value"
  currency: TokenRateCurrency
  perGamma: number
}

export const GAMMA_FACE_VALUE_USD = 1

/**
 * Converts the 1 USD face value into `currency` with the TAO market cross rate, `tao[c] / tao.usd`.
 * It never reads the on-chain TAO/USD oracle, which can lag the market.
 */
export const getGammaFaceValue = (
  tokenRates: TokenRatesList,
  taoTokenId: TokenId,
  currency: TokenRateCurrency
): GammaFaceValue | null => {
  const taoRates = tokenRates[taoTokenId]
  const taoUsd = taoRates?.usd?.price
  const taoInCurrency = taoRates?.[currency]?.price
  if (!taoUsd || typeof taoInCurrency !== "number") return null

  return {
    kind: "gamma-face-value",
    currency,
    perGamma: (GAMMA_FACE_VALUE_USD * taoInCurrency) / taoUsd,
  }
}
