export const calculateFee = ({
  amount,
  feePercent,
  seekDiscount,
}: {
  amount: bigint | null
  feePercent: number
  seekDiscount: number
}): bigint => {
  if (!amount) return 0n
  if (feePercent < 0) {
    throw new Error("Fee percentage cannot be negative")
  }

  // Convert each floating-point value to BigInt independently to avoid
  // IEEE 754 compound-rounding errors.
  // e.g. 0.3 * (1 - 0.05) * 100 = 28.499… in JS instead of 28.5,
  // which causes Math.round to pick the wrong integer.
  const SCALE = 10000n
  const feeBps = BigInt(Math.round(feePercent * Number(SCALE)))

  if (seekDiscount === 0 || !seekDiscount) {
    return (amount * feeBps) / (SCALE * 100n)
  }

  const discountBps = BigInt(Math.round(seekDiscount * Number(SCALE)))

  return (amount * feeBps * (SCALE - discountBps)) / (SCALE * SCALE * 100n)
}

export const calculateEffectiveFeeRate = (
  netuid: number | null,
  subnetFeePercent: number,
  seekDiscount: number
): number => {
  if (netuid === 0 || netuid === null) return 0
  // Scale each term independently to avoid IEEE 754 compound-rounding errors.
  const SCALE = 10000
  const feeBps = Math.round(subnetFeePercent * SCALE)
  const discountBps = Math.round((seekDiscount || 0) * SCALE)
  return (feeBps * (SCALE - discountBps)) / (SCALE * SCALE * 100)
}

// calculates the minimum input that accounts for swap fee and talisman fee
export const calculateMinimumStakeInput = (
  baseMinimum: bigint,
  swapFee: bigint,
  effectiveFeeRate: number
): bigint => {
  const baseMin = baseMinimum + swapFee

  if (effectiveFeeRate === 0) return baseMin

  if (effectiveFeeRate >= 1) {
    throw new Error("Effective fee rate must be less than 100%")
  }

  const multiplier = 10000n
  const feeMultiplier = multiplier - BigInt(Math.round(effectiveFeeRate * Number(multiplier)))

  return (baseMin * multiplier) / feeMultiplier
}
