import { BalanceFormatter } from "@talismn/balances"
import { formatDecimals } from "@talismn/util"
import type { InlineError } from "@ui/hooks/analytics/errorShown"
import BigNumber from "bignumber.js"
import type { TFunction } from "i18next"

type NominationRemainderInputs = {
  stake: bigint
  amount: bigint
  /** the largest amount the position allows, conviction locks excluded */
  maxAmount: bigint
  /** the chain's nominator minimum, in the position's alpha */
  minKeep: bigint
  /** the smallest amount the chain accepts for one staking operation, in the position's alpha */
  minAmount: bigint
}

export type SweepableRemainder = { kind: "exit-only" } | { kind: "partial"; maxPartial: bigint }

/**
 * The chain closes a nomination that an unstake leaves below its minimum
 * (`clear_small_nomination_if_required`). At max that is the point (the locked rest is swept to
 * fully exit), anywhere else it is a surprise: returns what the user can do instead, or null when
 * the amount is fine.
 */
export const getSweepableRemainder = ({
  stake,
  amount,
  maxAmount,
  minKeep,
  minAmount,
}: NominationRemainderInputs): SweepableRemainder | null => {
  const remaining = stake - amount
  if (amount <= 0n || amount >= maxAmount || remaining <= 0n || remaining >= minKeep) return null

  const maxPartial = stake - minKeep
  return maxPartial > 0n && maxPartial >= minAmount
    ? { kind: "partial", maxPartial }
    : { kind: "exit-only" }
}

/**
 * The chain values the remainder at the pool price after the unstake, and remove_stake_limit only
 * keeps that price above its limit price: the lower of that limit and the spot price at the
 * slippage tolerance, floored at 1 rao so a 100% tolerance asks for a full exit.
 */
export const getRemainderFloorPrice = ({
  alphaPrice,
  slippage,
  priceLimit,
}: {
  alphaPrice: bigint
  /** percentage, 0.5 = 0.5% */
  slippage: number
  /** the sell limit price of the unstake being built, null until simulated */
  priceLimit: bigint | null
}) => {
  const spotFloor = (alphaPrice * BigInt(10_000 - Math.round(slippage * 100))) / 10_000n
  const floor = priceLimit !== null && priceLimit < spotFloor ? priceLimit : spotFloor
  return floor > 0n ? floor : 1n
}

type TokenFormat = { decimals: number; symbol: string }

export type SweepableRemainderError = InlineError & { fillAmount: bigint | null }

/** an upper bound must never display rounded up, or typing it back fails again */
export const formatUpperBound = (plancks: bigint, decimals: number) =>
  formatDecimals(
    new BigNumber(new BalanceFormatter(plancks, decimals).tokens).precision(
      4,
      BigNumber.ROUND_DOWN
    ),
    4,
    { notation: "standard" }
  )

export const getSweepableRemainderError = (
  t: TFunction,
  remainder: SweepableRemainder,
  { minTao, tao, alpha }: { minTao: bigint; tao: TokenFormat; alpha: TokenFormat }
): SweepableRemainderError => {
  const minTaoText = new BalanceFormatter(minTao, tao.decimals).tokens
  if (remainder.kind === "exit-only")
    return {
      message: t(
        "Bittensor closes stakes worth less than {{minTao}} {{taoSymbol}}. Unstake everything.",
        {
          minTao: minTaoText,
          taoSymbol: tao.symbol,
        }
      ),
      category: "input_invalid",
      fillAmount: null,
    }

  return {
    message: t(
      "Bittensor closes stakes worth less than {{minTao}} {{taoSymbol}}. Unstake everything, or at most {{amount}} {{symbol}}.",
      {
        minTao: minTaoText,
        taoSymbol: tao.symbol,
        amount: formatUpperBound(remainder.maxPartial, alpha.decimals),
        symbol: alpha.symbol,
      }
    ),
    category: "input_invalid",
    fillAmount: remainder.maxPartial,
  }
}
