import type { RemoteConfigStoreData } from "@core/domains/app/types"

import type { StakeDirection } from "../hooks/types"
import { ROOT_NETUID, TALISMAN_FEE_BITTENSOR } from "./constants"
import { calculateFee, calculateMinimumStakeInput } from "./feeCalculations"
import { type BittensorSwapSimulation, getLimitPrice } from "./helpers"

type BittensorFeeConfig = RemoteConfigStoreData["bittensor"]["fee"]

/** percent, 0.3 is 0.3% */
export const getSubnetFeePercent = (
  fee: BittensorFeeConfig,
  netuid: number,
  direction: StakeDirection
): number => (direction === "alphaToTao" ? fee.sell : fee.buy)?.[netuid] ?? TALISMAN_FEE_BITTENSOR

type FeeTerms = {
  /** percent, 0.3 is 0.3% */
  feePercent: number
  seekDiscount: number
}

export const getPoolInput = ({
  direction,
  netuid,
  amountIn,
  feePercent,
  seekDiscount,
}: FeeTerms & { direction: StakeDirection; netuid: number; amountIn: bigint }): bigint =>
  netuid === ROOT_NETUID || direction === "alphaToTao"
    ? amountIn
    : amountIn - calculateFee({ amount: amountIn, feePercent, seekDiscount })

export type StakingQuoteMath = {
  /** TAO: taken from the input of a stake, from the simulated proceeds of an unstake */
  talismanFee: bigint
  amountOut: bigint
  /** rao per alpha, what this trade pays with no slippage */
  swapPrice: bigint
  /** rao per alpha, the worst price the extrinsic accepts */
  priceLimit: bigint
  /** percent, null without a spot price */
  priceImpact: number | null
}

export const getStakingQuoteMath = ({
  direction,
  amountIn,
  feePercent,
  seekDiscount,
  simulation,
  alphaPrice,
  slippage,
}: FeeTerms & {
  direction: StakeDirection
  amountIn: bigint
  /** of `getPoolInput` */
  simulation: BittensorSwapSimulation
  alphaPrice: bigint | null
  /** decimal, 0.005 is 0.5% */
  slippage: number
}): StakingQuoteMath => {
  // WARNING: because of slippage it would make more sense to send alpha instead of tao when unstaking
  const talismanFee = calculateFee({
    amount: direction === "taoToAlpha" ? amountIn : simulation.tao_amount,
    feePercent,
    seekDiscount,
  })
  const swapPrice = getLimitPrice(simulation, direction, 0)

  return {
    talismanFee,
    amountOut:
      direction === "taoToAlpha" ? simulation.alpha_amount : simulation.tao_amount - talismanFee,
    swapPrice,
    priceLimit: getLimitPrice(simulation, direction, slippage),
    priceImpact:
      alphaPrice && swapPrice
        ? Number(((swapPrice - alphaPrice) * 10_000n) / alphaPrice) / 100
        : null,
  }
}

/**
 * The least TAO a stake accepts as input for the chain to still see `baseMinimum` once the pool
 * fee and the Talisman fee are taken. Root pays neither. Null until its inputs are known.
 */
export const getMinimumStakeInput = ({
  netuid,
  baseMinimum,
  minStakeSimulation,
  effectiveFeeRate,
}: {
  netuid: number | null
  baseMinimum: bigint | null | undefined
  /** a stake of the chain's minimum, simulated for its pool fee */
  minStakeSimulation: BittensorSwapSimulation | null | undefined
  effectiveFeeRate: number
}): bigint | null => {
  if (typeof baseMinimum !== "bigint") return null
  if (netuid === ROOT_NETUID || netuid === null) return baseMinimum
  if (!minStakeSimulation) return null

  return calculateMinimumStakeInput(baseMinimum, minStakeSimulation.tao_fee, effectiveFeeRate)
}
