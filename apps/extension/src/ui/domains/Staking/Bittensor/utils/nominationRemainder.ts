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

export type SweepableRemainder = {
  /** the largest amount that keeps the position open, null when no partial amount is valid */
  maxPartial: bigint | null
}

/**
 * The chain closes a nomination left below its minimum (`clear_small_nomination_if_required`).
 * At max that is the point (the locked rest is swept to fully exit), anywhere else it is a
 * surprise: returns what the user can do instead, or null when the amount is fine.
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
  return { maxPartial: maxPartial > 0n && maxPartial >= minAmount ? maxPartial : null }
}
