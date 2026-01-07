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

  if (seekDiscount === 0 || !seekDiscount) {
    return (amount * BigInt(Math.round(feePercent * 100))) / 10000n
  }

  const discountedFee = feePercent * (1 - seekDiscount)

  return (amount * BigInt(Math.round(discountedFee * 100))) / 10000n
}

export const calculateEffectiveFeeRate = (
  netuid: number | null,
  subnetFeePercent: number,
  seekDiscount: number,
): number => {
  if (netuid === 0 || netuid === null) return 0
  const discountedFee = subnetFeePercent * (1 - (seekDiscount || 0))
  return discountedFee / 100
}

// calculates the minimum input that accounts for swap fee and talisman fee
export const calculateMinimumStakeInput = (
  baseMinimum: bigint,
  swapFee: bigint,
  effectiveFeeRate: number,
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
