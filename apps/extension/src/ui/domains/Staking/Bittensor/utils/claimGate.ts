/**
 * `RootClaimableThreshold` is stored as fixed-point rao with 32 fractional bits — the
 * `sudo_set_root_claim_threshold` extrinsic takes plain rao and stores it shifted left by
 * 32, and the metadata fallback is 500,000 rao (τ0.0005) in the same representation.
 * Rounds up so a fractional threshold can never open the gate on a claim the chain would
 * dust-skip.
 */
export const rootClaimThresholdToPlancks = (raw: bigint): bigint => (raw + (1n << 32n) - 1n) >> 32n

export type BittensorClaimGateInputs = {
  hasAccount: boolean
  /** claimable per the cached balances stream, null once its entitlement row is gone */
  streamedClaimablePlancks: bigint | null
  /** fresh chain read of the target pair's payout, refetched every block */
  freshPayoutPlancks: bigint | undefined
  /** false while the fresh read is loading or after it errors: both must block */
  isFreshPayoutReady: boolean
  /** claims below RootClaimableThreshold[ROOT] are skipped on-chain as dust */
  dustThreshold: bigint
  isDustThresholdReady: boolean
  isHoldIntervalReady: boolean
}

/**
 * Single gate for submitting a root rewards claim (spec 441).
 *
 * A claim whose entitlement dropped below `RootClaimableThreshold` — or was claimed from
 * another device — still succeeds on-chain as a silently-skipped paid no-op (E2E-verified:
 * `RootClaimed` with 0 TAO). Payouts are NAV quotes that move with subnet pool prices every
 * block, so only the fresh per-block read decides; the balances stream merely seeds the
 * display until it settles. While any input is unresolved (loading or RPC error) the gate
 * stays closed: reading absent values as zero would open gates the chain keeps closed and
 * skip the hold warning.
 */
export const getBittensorClaimGate = ({
  hasAccount,
  streamedClaimablePlancks,
  freshPayoutPlancks,
  isFreshPayoutReady,
  dustThreshold,
  isDustThresholdReady,
  isHoldIntervalReady,
}: BittensorClaimGateInputs) => {
  const claimablePlancks = freshPayoutPlancks ?? streamedClaimablePlancks ?? 0n

  const isClaimUnavailable =
    streamedClaimablePlancks === null || (isFreshPayoutReady && freshPayoutPlancks === 0n)

  const isBelowDustThreshold =
    claimablePlancks > 0n && dustThreshold > 0n && claimablePlancks < dustThreshold

  const canSubmit =
    hasAccount &&
    !isClaimUnavailable &&
    isFreshPayoutReady &&
    isDustThresholdReady &&
    isHoldIntervalReady &&
    !isBelowDustThreshold

  return { claimablePlancks, isClaimUnavailable, isBelowDustThreshold, canSubmit }
}
