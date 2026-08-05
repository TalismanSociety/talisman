export type BittensorUnbondClaimOptionInputs = {
  isRootUnbond: boolean
  /** user preference from the wizard state, defaults to true (opt-out) */
  withClaim: boolean
  claimablePlancks: bigint
  isClaimUnavailable: boolean
  /** full fail-closed claim gate, false while any read is unresolved */
  canSubmit: boolean
}

/**
 * Decides whether the root unstake form offers to batch a rewards claim into the
 * unstake transaction, and whether the claim call is actually included.
 *
 * The batch is atomic, so the claim is only included when the full claim gate passes:
 * when the gate is closed (below RootClaimableThreshold, or a read unresolved) the
 * unstake proceeds without it — safe, as the entitlement survives a full unstake.
 */
export const getBittensorUnbondClaimOption = ({
  isRootUnbond,
  withClaim,
  claimablePlancks,
  isClaimUnavailable,
  canSubmit,
}: BittensorUnbondClaimOptionInputs) => {
  const showRow = isRootUnbond && !isClaimUnavailable && claimablePlancks > 0n
  const isRowDisabled = showRow && !canSubmit
  const includeClaim = showRow && canSubmit && withClaim

  return { showRow, isRowDisabled, isChecked: includeClaim, includeClaim }
}
