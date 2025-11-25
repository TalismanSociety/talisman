export const TAO_DECIMALS = 9n

// manipulating price as bigint requires using at least as many decimals as TAO itself
export const ALPHA_PRICE_SCALE = 10n ** TAO_DECIMALS

export const getScaledAlphaPrice = (alphaIn: bigint, taoIn: bigint): bigint => {
  if (!alphaIn || !taoIn) return 0n
  return (taoIn * ALPHA_PRICE_SCALE) / alphaIn
}

export const alphaToTao = (alpha: bigint, scaledAlphaPrice: bigint): bigint => {
  if (!alpha || !scaledAlphaPrice) return 0n
  return (alpha * scaledAlphaPrice) / ALPHA_PRICE_SCALE
}

export const taoToAlpha = (tao: bigint, scaledAlphaPrice: bigint): bigint => {
  if (!tao || !scaledAlphaPrice) return 0n
  return (tao * ALPHA_PRICE_SCALE) / scaledAlphaPrice
}
