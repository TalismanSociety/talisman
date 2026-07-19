export const TAO_DECIMALS = 9n

// manipulating price as bigint requires using at least as many decimals as TAO itself
export const ALPHA_PRICE_SCALE = 10n ** TAO_DECIMALS

export const alphaToTao = (alpha: bigint, scaledAlphaPrice: bigint): bigint => {
  if (!alpha || !scaledAlphaPrice) return 0n
  return (alpha * scaledAlphaPrice) / ALPHA_PRICE_SCALE
}

export const taoToAlpha = (tao: bigint, scaledAlphaPrice: bigint): bigint => {
  if (!tao || !scaledAlphaPrice) return 0n
  return (tao * ALPHA_PRICE_SCALE) / scaledAlphaPrice
}

/**
 * Like taoToAlpha but rounds up. Use for "must keep / must send at least this much alpha"
 * thresholds: the chain floors the alpha→TAO conversion when checking its TAO-denominated
 * minimums, so a floored alpha threshold can sit one planck below the real bound — an amount
 * meeting it exactly would still fail the on-chain check (or get the position force-swept).
 * Guarantees alphaToTao(taoToAlphaCeil(tao, price), price) >= tao.
 */
export const taoToAlphaCeil = (tao: bigint, scaledAlphaPrice: bigint): bigint => {
  if (!tao || !scaledAlphaPrice) return 0n
  return (tao * ALPHA_PRICE_SCALE + scaledAlphaPrice - 1n) / scaledAlphaPrice
}
