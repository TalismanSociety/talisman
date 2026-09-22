import { describe, expect, it } from "vitest"

import {
  type BittensorBasketClaimPreview,
  type BittensorClaimGateInputs,
  getBittensorClaimGate,
  rootClaimThresholdToPlancks,
} from "./claimGate"

describe("rootClaimThresholdToPlancks", () => {
  it("decodes the metadata fallback to the documented τ0.0005 default", () => {
    expect(rootClaimThresholdToPlancks(2147483648000000n)).toBe(500_000n)
  })

  it("decodes a setter-stored value back to the rao it was set with", () => {
    // sudo_set_root_claim_threshold(0, 1_000_000) stores 1_000_000 << 32 (devnet-verified)
    expect(rootClaimThresholdToPlancks(4294967296000000n)).toBe(1_000_000n)
  })

  it("keeps an unset threshold at zero", () => {
    expect(rootClaimThresholdToPlancks(0n)).toBe(0n)
  })

  it("rounds a fractional threshold up so the gate stays fail-closed", () => {
    expect(rootClaimThresholdToPlancks(3n << 31n)).toBe(2n)
  })
})

const preview = (
  redeemableTao: bigint,
  accruedTao = redeemableTao,
  dustRows = 0
): BittensorBasketClaimPreview => ({
  hotkey: "hotkey-1",
  accrued_tao: accruedTao,
  redeemable_tao: redeemableTao,
  forfeited_tao_est: accruedTao - redeemableTao,
  dust_rows: dustRows,
})

const OPEN_GATE: BittensorClaimGateInputs = {
  hasAccount: true,
  streamedClaimablePlancks: 100n,
  freshPreview: preview(100n),
  isFreshPreviewReady: true,
  dustThreshold: 50n,
  isDustThresholdReady: true,
  isHoldIntervalReady: true,
}

describe("getBittensorClaimGate", () => {
  it("submits when every read has settled and the redeemable amount clears the threshold", () => {
    expect(getBittensorClaimGate(OPEN_GATE)).toEqual({
      claimablePlancks: 100n,
      forfeitedPlancks: 0n,
      dustRows: 0,
      isClaimUnavailable: false,
      isBelowDustThreshold: false,
      canSubmit: true,
    })
  })

  it("displays the redeemable amount and reports the forfeited dust rows", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, freshPreview: preview(80n, 100n, 3) })
    expect(gate.claimablePlancks).toBe(80n)
    expect(gate.forfeitedPlancks).toBe(20n)
    expect(gate.dustRows).toBe(3)
    expect(gate.canSubmit).toBe(true)
  })

  it("blocks when the entitlement was claimed concurrently (fresh preview is None)", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, freshPreview: null })
    expect(gate.isClaimUnavailable).toBe(true)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks when the fresh preview has no entitlement left", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, freshPreview: preview(0n, 0n) })
    expect(gate.isClaimUnavailable).toBe(true)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks when the balances row is gone even while the fresh read still lags behind", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, streamedClaimablePlancks: null })
    expect(gate.isClaimUnavailable).toBe(true)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks as dust when the redeemable amount is below the threshold the full entitlement clears", () => {
    // spec 468: the chain compares redeemable_tao (entitlement minus dust rows), not accrued_tao
    const gate = getBittensorClaimGate({ ...OPEN_GATE, freshPreview: preview(40n, 100n, 2) })
    expect(gate).toEqual({
      claimablePlancks: 40n,
      forfeitedPlancks: 60n,
      dustRows: 2,
      isClaimUnavailable: false,
      isBelowDustThreshold: true,
      canSubmit: false,
    })
  })

  it("blocks as dust when the entitlement is made only of dust rows, whatever the threshold", () => {
    const gate = getBittensorClaimGate({
      ...OPEN_GATE,
      dustThreshold: 0n,
      freshPreview: preview(0n, 100n, 4),
    })
    expect(gate.isClaimUnavailable).toBe(false)
    expect(gate.isBelowDustThreshold).toBe(true)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks when NAV drift takes the redeemable amount below the threshold", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, freshPreview: preview(40n) })
    expect(gate.isBelowDustThreshold).toBe(true)
    expect(gate.canSubmit).toBe(false)
  })

  it("submits when NAV drift takes the redeemable amount above the threshold the stream is below", () => {
    const gate = getBittensorClaimGate({
      ...OPEN_GATE,
      streamedClaimablePlancks: 40n,
      freshPreview: preview(60n),
    })
    expect(gate.isBelowDustThreshold).toBe(false)
    expect(gate.canSubmit).toBe(true)
  })

  it("blocks while the fresh preview read is unresolved, displaying the streamed value", () => {
    const gate = getBittensorClaimGate({
      ...OPEN_GATE,
      freshPreview: undefined,
      isFreshPreviewReady: false,
    })
    expect(gate.claimablePlancks).toBe(100n)
    expect(gate.forfeitedPlancks).toBe(0n)
    expect(gate.isClaimUnavailable).toBe(false)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks when a refetch error leaves only a stale fresh preview", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, isFreshPreviewReady: false })
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks while the dust threshold or hold interval reads are unresolved", () => {
    expect(getBittensorClaimGate({ ...OPEN_GATE, isDustThresholdReady: false }).canSubmit).toBe(
      false
    )
    expect(getBittensorClaimGate({ ...OPEN_GATE, isHoldIntervalReady: false }).canSubmit).toBe(
      false
    )
  })

  it("blocks without a resolved account", () => {
    expect(getBittensorClaimGate({ ...OPEN_GATE, hasAccount: false }).canSubmit).toBe(false)
  })

  it("skips the dust check when the threshold is unset (zero)", () => {
    const gate = getBittensorClaimGate({
      ...OPEN_GATE,
      dustThreshold: 0n,
      streamedClaimablePlancks: 1n,
      freshPreview: preview(1n),
    })
    expect(gate.isBelowDustThreshold).toBe(false)
    expect(gate.canSubmit).toBe(true)
  })
})
