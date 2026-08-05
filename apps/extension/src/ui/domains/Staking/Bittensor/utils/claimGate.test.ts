import { describe, expect, it } from "vitest"

import { type BittensorClaimGateInputs, getBittensorClaimGate } from "./claimGate"

const OPEN_GATE: BittensorClaimGateInputs = {
  hasAccount: true,
  streamedClaimablePlancks: 100n,
  freshPayoutPlancks: 100n,
  isFreshPayoutReady: true,
  dustThreshold: 50n,
  isDustThresholdReady: true,
  isHoldIntervalReady: true,
}

describe("getBittensorClaimGate", () => {
  it("submits when every read has settled and the fresh payout clears the threshold", () => {
    expect(getBittensorClaimGate(OPEN_GATE)).toEqual({
      claimablePlancks: 100n,
      isClaimUnavailable: false,
      isBelowDustThreshold: false,
      canSubmit: true,
    })
  })

  it("blocks when the entitlement was claimed concurrently (fresh read is zero)", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, freshPayoutPlancks: 0n })
    expect(gate.isClaimUnavailable).toBe(true)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks when the balances row is gone even while the fresh read still lags behind", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, streamedClaimablePlancks: null })
    expect(gate.isClaimUnavailable).toBe(true)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks when NAV drift takes the fresh payout below the threshold", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, freshPayoutPlancks: 40n })
    expect(gate).toEqual({
      claimablePlancks: 40n,
      isClaimUnavailable: false,
      isBelowDustThreshold: true,
      canSubmit: false,
    })
  })

  it("submits when NAV drift takes the fresh payout above the threshold the stream is below", () => {
    const gate = getBittensorClaimGate({
      ...OPEN_GATE,
      streamedClaimablePlancks: 40n,
      freshPayoutPlancks: 60n,
    })
    expect(gate.isBelowDustThreshold).toBe(false)
    expect(gate.canSubmit).toBe(true)
  })

  it("blocks while the fresh payout read is unresolved, displaying the streamed value", () => {
    const gate = getBittensorClaimGate({
      ...OPEN_GATE,
      freshPayoutPlancks: undefined,
      isFreshPayoutReady: false,
    })
    expect(gate.claimablePlancks).toBe(100n)
    expect(gate.isClaimUnavailable).toBe(false)
    expect(gate.canSubmit).toBe(false)
  })

  it("blocks when a refetch error leaves only a stale fresh payout", () => {
    const gate = getBittensorClaimGate({ ...OPEN_GATE, isFreshPayoutReady: false })
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
      freshPayoutPlancks: 1n,
    })
    expect(gate.isBelowDustThreshold).toBe(false)
    expect(gate.canSubmit).toBe(true)
  })
})
