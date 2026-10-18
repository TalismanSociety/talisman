import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { MevShieldWindow } from "@core/domains/substrate/types"
import type { TalismanLedgerError } from "@ui/hooks/ledger/errors"
import type { Hex } from "viem"

/** The base payload as it was when the inner signature, made over its nonce + 1, was given */
export type SignedInner = { payload: SignerPayloadJSON; innerSignature: Hex }

export type LedgerMevShieldStage =
  | { kind: "idle" }
  | { kind: "signingInner" }
  | { kind: "awaitingBlock"; signed: SignedInner }
  | { kind: "signingOuter"; signed: SignedInner; shieldWindow: MevShieldWindow }
  | { kind: "submitting"; signed: SignedInner }
  | { kind: "missed"; signed: SignedInner; reason: "timeout" | "interrupted" }
  | { kind: "failed"; error: TalismanLedgerError; signed?: SignedInner }

export type LedgerMevShieldState = {
  stage: LedgerMevShieldStage
  attempt: number
  deviceBusy: boolean
}

export type LedgerMevShieldEvent =
  | { type: "start" }
  | { type: "innerSigned"; attempt: number; signed: SignedInner }
  | { type: "windowOpened"; attempt: number; shieldWindow: MevShieldWindow }
  | { type: "outerSigned"; attempt: number; at: number }
  | { type: "deadlinePassed"; attempt: number }
  | { type: "broadcastMissed"; attempt: number }
  | { type: "submitted"; attempt: number }
  | { type: "failed"; attempt: number; error: TalismanLedgerError; retryable: boolean }
  | { type: "retry" }
  | { type: "errorDismissed" }
  | { type: "deviceBusy"; busy: boolean }
  | { type: "reset" }

export const initialLedgerMevShieldState: LedgerMevShieldState = {
  stage: { kind: "idle" },
  attempt: 0,
  deviceBusy: false,
}

const signedOf = (stage: LedgerMevShieldStage) => ("signed" in stage ? stage.signed : undefined)

const nextRun = (
  state: LedgerMevShieldState,
  stage: LedgerMevShieldStage
): LedgerMevShieldState => ({ ...state, stage, attempt: state.attempt + 1 })

const timedOut = (state: LedgerMevShieldState, signed: SignedInner) =>
  nextRun(state, { kind: "missed", signed, reason: "timeout" })

export const ledgerMevShieldReducer = (
  state: LedgerMevShieldState,
  event: LedgerMevShieldEvent
): LedgerMevShieldState => {
  if ("attempt" in event && event.attempt !== state.attempt) return state
  const { stage } = state

  switch (event.type) {
    case "start":
      return stage.kind === "idle" && !state.deviceBusy
        ? nextRun(state, { kind: "signingInner" })
        : state

    case "innerSigned":
      return stage.kind === "signingInner"
        ? { ...state, stage: { kind: "awaitingBlock", signed: event.signed } }
        : state

    case "windowOpened":
      return stage.kind === "awaitingBlock"
        ? {
            ...state,
            stage: { kind: "signingOuter", signed: stage.signed, shieldWindow: event.shieldWindow },
          }
        : state

    case "outerSigned":
      if (stage.kind !== "signingOuter") return state
      if (event.at >= stage.shieldWindow.deadline) return timedOut(state, stage.signed)
      return { ...state, stage: { kind: "submitting", signed: stage.signed } }

    case "deadlinePassed":
      return stage.kind === "signingOuter" ? timedOut(state, stage.signed) : state

    case "broadcastMissed":
      return stage.kind === "submitting" ? timedOut(state, stage.signed) : state

    case "submitted":
      return stage.kind === "submitting" ? nextRun(state, { kind: "idle" }) : state

    case "failed":
      return stage.kind === "idle" || stage.kind === "missed" || stage.kind === "failed"
        ? state
        : nextRun(state, {
            kind: "failed",
            error: event.error,
            signed: event.retryable ? signedOf(stage) : undefined,
          })

    case "retry":
      return stage.kind === "missed" && !state.deviceBusy
        ? nextRun(state, { kind: "awaitingBlock", signed: stage.signed })
        : state

    case "errorDismissed":
      if (stage.kind !== "failed") return state
      return {
        ...state,
        stage: stage.signed
          ? { kind: "missed", signed: stage.signed, reason: "interrupted" }
          : { kind: "idle" },
      }

    case "deviceBusy":
      return { ...state, deviceBusy: event.busy }

    case "reset":
      return stage.kind === "submitting" ? state : nextRun(state, { kind: "idle" })
  }
}
