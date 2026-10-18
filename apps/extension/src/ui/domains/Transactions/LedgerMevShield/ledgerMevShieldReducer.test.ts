import type { SignerPayloadJSON } from "@core/domains/signing/types"
import { TalismanLedgerError } from "@ui/hooks/ledger/errors"
import { describe, expect, it } from "vitest"
import {
  initialLedgerMevShieldState,
  type LedgerMevShieldEvent,
  type LedgerMevShieldState,
  ledgerMevShieldReducer,
} from "./ledgerMevShieldReducer"

const payload: SignerPayloadJSON = {
  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  blockHash: "0x1234",
  blockNumber: "0x000003e8",
  era: "0x5500",
  genesisHash: "0x2f0555cc76fc2840a25a6ea3b9637146806f1f44b090c175ffde2a7e5ab36c03",
  method: "0x0700",
  nonce: "0x0000000f",
  specVersion: "0x000001df",
  tip: "0x00000000000000000000000000000000",
  transactionVersion: "0x00000001",
  signedExtensions: ["CheckNonce", "CheckMetadataHash"],
  version: 4,
}
const signed = { payload, innerSignature: "0x01" } as const
const shieldWindow = { headNumber: 1000, deadline: 31_000 }
const rejected = new TalismanLedgerError("UserRejected", "Rejected by user")

const run = (...events: LedgerMevShieldEvent[]) =>
  events.reduce<LedgerMevShieldState>(ledgerMevShieldReducer, initialLedgerMevShieldState)

const signingOuter = () =>
  run(
    { type: "start" },
    { type: "innerSigned", attempt: 1, signed },
    { type: "windowOpened", attempt: 1, shieldWindow }
  )

const submitting = () =>
  ledgerMevShieldReducer(signingOuter(), { type: "outerSigned", attempt: 1, at: 30_999 })

describe("ledgerMevShieldReducer", () => {
  it("signs the inner payload, waits for a block, then signs the outer one", () => {
    expect(signingOuter().stage).toEqual({ kind: "signingOuter", signed, shieldWindow })
    expect(submitting().stage).toEqual({ kind: "submitting", signed })
  })

  it("never submits an outer signature that arrives after the deadline", () => {
    const state = ledgerMevShieldReducer(signingOuter(), {
      type: "outerSigned",
      attempt: 1,
      at: shieldWindow.deadline,
    })

    expect(state.stage).toEqual({ kind: "missed", signed, reason: "timeout" })
  })

  it("drops the device answer of a window that already closed", () => {
    const missed = ledgerMevShieldReducer(signingOuter(), { type: "deadlinePassed", attempt: 1 })

    expect(ledgerMevShieldReducer(missed, { type: "outerSigned", attempt: 1, at: 0 })).toBe(missed)
    expect(
      ledgerMevShieldReducer(missed, {
        type: "failed",
        attempt: 1,
        error: rejected,
        retryable: true,
      })
    ).toBe(missed)
  })

  it("keeps showing the broadcast in flight when the countdown ends during it", () => {
    const sending = submitting()

    expect(ledgerMevShieldReducer(sending, { type: "deadlinePassed", attempt: 1 })).toBe(sending)
    expect(ledgerMevShieldReducer(sending, { type: "reset" })).toBe(sending)
  })

  it("misses the window when the background found it closed at broadcast", () => {
    expect(
      ledgerMevShieldReducer(submitting(), { type: "broadcastMissed", attempt: 1 }).stage
    ).toEqual({ kind: "missed", signed, reason: "timeout" })
    expect(ledgerMevShieldReducer(signingOuter(), { type: "broadcastMissed", attempt: 1 })).toEqual(
      signingOuter()
    )
  })

  it("ends the run once submitted, and ignores a late submitted of another run", () => {
    const done = ledgerMevShieldReducer(submitting(), { type: "submitted", attempt: 1 })

    expect(done.stage).toEqual({ kind: "idle" })
    expect(ledgerMevShieldReducer(done, { type: "submitted", attempt: 1 })).toBe(done)
  })

  it("keeps the inner signature when the submit fails, so it can be tried again", () => {
    const failed = ledgerMevShieldReducer(submitting(), {
      type: "failed",
      attempt: 1,
      error: rejected,
      retryable: true,
    })

    expect(failed.stage).toEqual({ kind: "failed", error: rejected, signed })
    expect(ledgerMevShieldReducer(failed, { type: "errorDismissed" }).stage).toEqual({
      kind: "missed",
      signed,
      reason: "interrupted",
    })
  })

  it("retries with the same signed payload, once the device is free", () => {
    const missed = run(
      { type: "start" },
      { type: "innerSigned", attempt: 1, signed },
      { type: "windowOpened", attempt: 1, shieldWindow },
      { type: "deviceBusy", busy: true },
      { type: "deadlinePassed", attempt: 1 }
    )

    expect(ledgerMevShieldReducer(missed, { type: "retry" })).toBe(missed)

    const retried = [
      { type: "deviceBusy", busy: false } as const,
      { type: "retry" } as const,
    ].reduce(ledgerMevShieldReducer, missed)

    expect(retried.stage).toEqual({ kind: "awaitingBlock", signed })
    expect(
      ledgerMevShieldReducer(retried, { type: "windowOpened", attempt: 1, shieldWindow })
    ).toBe(retried)
    expect(
      ledgerMevShieldReducer(retried, {
        type: "windowOpened",
        attempt: retried.attempt,
        shieldWindow,
      }).stage
    ).toEqual({ kind: "signingOuter", signed, shieldWindow })
  })

  it("starts afresh after a failed first signature", () => {
    const innerRejected = run(
      { type: "start" },
      { type: "failed", attempt: 1, error: rejected, retryable: true },
      { type: "errorDismissed" }
    )

    expect(innerRejected.stage).toEqual({ kind: "idle" })
  })

  it("forgets the inner signature when it can no longer be included", () => {
    const expired = ledgerMevShieldReducer(
      run({ type: "start" }, { type: "innerSigned", attempt: 1, signed }),
      { type: "failed", attempt: 1, error: rejected, retryable: false }
    )

    expect(expired.stage).toEqual({ kind: "failed", error: rejected, signed: undefined })
  })

  it("ignores a late answer after a reset", () => {
    const reset = run({ type: "start" }, { type: "reset" })

    expect(ledgerMevShieldReducer(reset, { type: "innerSigned", attempt: 1, signed })).toBe(reset)
  })

  it("does not start while a prompt of an abandoned run is still open on the device", () => {
    const busy = run({ type: "deviceBusy", busy: true })

    expect(ledgerMevShieldReducer(busy, { type: "start" })).toBe(busy)
  })
})
