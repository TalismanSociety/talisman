/**
 * `RootClaimableThreshold` is stored as fixed-point rao with 32 fractional bits — the
 * `sudo_set_root_claim_threshold` extrinsic takes plain rao and stores it shifted left by
 * 32, and the metadata fallback is 500,000 rao (τ0.0005) in the same representation.
 * Rounds up so a fractional threshold can never open the gate on a claim the chain would
 * dust-skip.
 */
export const rootClaimThresholdToPlancks = (raw: bigint): bigint => (raw + (1n << 32n) - 1n) >> 32n

/** decoded `BetaBasketRuntimeApi.get_basket_claim_preview` (spec 468), the fields the gate reads */
export type BittensorBasketClaimPreview = {
  hotkey: string
  /** full entitlement at the pre-sale realizable quote */
  accrued_tao: bigint
  /** what the claim pays: the entitlement excluding the skipped dust rows */
  redeemable_tao: bigint
  /** estimated value of the skipped dust rows, left in the fund for the remaining holders */
  forfeited_tao_est: bigint
  /** fund rows the claim skips as dust */
  dust_rows: number
}

export type BittensorClaimGateInputs = {
  hasAccount: boolean
  /** claimable per the cached balances stream, null once its entitlement row is gone */
  streamedClaimablePlancks: bigint | null
  /** fresh chain read of the target pair's claim preview, null when nothing is owed */
  freshPreview: BittensorBasketClaimPreview | null | undefined
  /** false while the fresh read is loading or after it errors: both must block */
  isFreshPreviewReady: boolean
  /** claims whose redeemable amount is below RootClaimableThreshold[ROOT] are skipped on-chain as dust */
  dustThreshold: bigint
  isDustThresholdReady: boolean
  isHoldIntervalReady: boolean
}

/**
 * Single gate for submitting a root rewards claim (spec 441).
 *
 * A claim whose entitlement dropped below `RootClaimableThreshold` — or was claimed from
 * another device — still succeeds on-chain as a silently-skipped paid no-op (E2E-verified:
 * `RootClaimed` with 0 TAO). Since spec 468 the chain compares the *redeemable* amount (the
 * entitlement minus the fund rows too small to sell) to the threshold, pays that amount and
 * burns the full entitlement, so the gate reads the chain's own claim preview: what it pays,
 * and what the dust rows would forfeit. Payouts are NAV quotes that move with subnet pool
 * prices every block, so only the fresh per-block read decides; the balances stream merely
 * seeds the display until it settles. While any input is unresolved (loading or RPC error)
 * the gate stays closed: reading absent values as zero would open gates the chain keeps
 * closed and skip the hold warning.
 */
export const getBittensorClaimGate = ({
  hasAccount,
  streamedClaimablePlancks,
  freshPreview,
  isFreshPreviewReady,
  dustThreshold,
  isDustThresholdReady,
  isHoldIntervalReady,
}: BittensorClaimGateInputs) => {
  const claimablePlancks = freshPreview?.redeemable_tao ?? streamedClaimablePlancks ?? 0n

  const isEntitlementGone =
    isFreshPreviewReady && (!freshPreview || freshPreview.accrued_tao === 0n)
  const isClaimUnavailable = streamedClaimablePlancks === null || isEntitlementGone

  // a zero redeemable amount is a no-op whatever the threshold: the entitlement is dust only
  const isBelowDustThreshold =
    !isClaimUnavailable &&
    (claimablePlancks < dustThreshold || (isFreshPreviewReady && claimablePlancks === 0n))

  const forfeitedPlancks = isFreshPreviewReady ? (freshPreview?.forfeited_tao_est ?? 0n) : 0n
  const dustRows = isFreshPreviewReady ? (freshPreview?.dust_rows ?? 0) : 0

  const canSubmit =
    hasAccount &&
    !isClaimUnavailable &&
    isFreshPreviewReady &&
    isDustThresholdReady &&
    isHoldIntervalReady &&
    !isBelowDustThreshold

  return {
    claimablePlancks,
    forfeitedPlancks,
    dustRows,
    isClaimUnavailable,
    isBelowDustThreshold,
    canSubmit,
  }
}
