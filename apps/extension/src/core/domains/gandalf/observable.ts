import {
  anchorClocks,
  type ClockAnchor,
  elapsedSince,
  GANDALF_TOKEN_EXPIRY_BUFFER_MS,
} from "@common/gandalfTokenClock"
import { log } from "@common/log"
import { getErrorMessage } from "@talismn/util"
import { Subject } from "rxjs"

import {
  GandalfRequestError,
  type ProofOfWorkSolve,
  registerInstall,
  requestAccessToken,
} from "./client"
import { gandalfStore } from "./store"

export const proofOfWorkSolves$ = new Subject<ProofOfWorkSolve>()

const MIN_BACKOFF_MS = 30_000
const MAX_BACKOFF_MS = 10 * 60_000
const EXP_ROUNDED_DOWN_TO_SECOND_MS = 1_000

type TokenState =
  | { kind: "none" }
  | { kind: "token"; accessToken: string; requestedAt: ClockAnchor; ttlMs: number }
  | { kind: "backoff"; failedAt: ClockAnchor; waitMs: number; error: Error }

let state: TokenState = { kind: "none" }
let acquisition: Promise<string> | null = null

const isFresh = (requestedAt: ClockAnchor, ttlMs: number) =>
  elapsedSince(requestedAt) < ttlMs - GANDALF_TOKEN_EXPIRY_BUFFER_MS - EXP_ROUNDED_DOWN_TO_SECOND_MS

/**
 * Resolves to a Gandalf access token that stays valid for at least
 * `GANDALF_TOKEN_EXPIRY_BUFFER_MS` after this call.
 *
 * Serves the cached token while it is fresh, rejects without a request while a failed
 * acquisition is in its backoff window, and otherwise joins or starts the single in-flight
 * acquisition, which no caller can abort.
 */
export const getAccessToken = (): Promise<string> => {
  if (state.kind === "token" && isFresh(state.requestedAt, state.ttlMs))
    return Promise.resolve(state.accessToken)
  if (state.kind === "backoff" && elapsedSince(state.failedAt) < state.waitMs)
    return Promise.reject(state.error)
  acquisition ??= acquire().finally(() => {
    acquisition = null
  })
  return acquisition
}

const acquire = async (): Promise<string> => {
  try {
    const { installId, privateKeyHex } = await ensureRegistered()
    const requestedAt = anchorClocks()
    const { accessToken, expiresIn } = await requestAccessToken(installId, privateKeyHex)
    const ttlMs = expiresIn * 1000
    if (!isFresh(requestedAt, ttlMs)) throw new Error("Gandalf access token was stale on arrival")
    state = { kind: "token", accessToken, requestedAt, ttlMs }
    return accessToken
  } catch (cause) {
    const error =
      cause instanceof Error
        ? cause
        : new Error(getErrorMessage(cause, "Failed to obtain access token"))
    log.error("Gandalf: failed to obtain access token", error)
    state = { kind: "backoff", failedAt: anchorClocks(), waitMs: backoffMs(error), error }
    throw error
  }
}

const backoffMs = (error: Error) => {
  const retryAfterMs = error instanceof GandalfRequestError ? (error.retryAfter ?? 0) * 1000 : 0
  return Math.min(MAX_BACKOFF_MS, Math.max(MIN_BACKOFF_MS, retryAfterMs))
}

async function ensureRegistered(): Promise<{ installId: string; privateKeyHex: string }> {
  const { installId, privateKeyHex } = await gandalfStore.get()

  if (installId && privateKeyHex) return { installId, privateKeyHex }

  log.debug("Gandalf: no install credentials found, registering…")
  const credentials = await registerInstall()
  proofOfWorkSolves$.next(credentials.proofOfWork)

  // credentials may have appeared while the proof-of-work was solving (e.g. e2e fixtures
  // seeding pre-registered ones) - keep them, ours were never used to sign anything
  const existing = await gandalfStore.get()
  if (existing.installId && existing.privateKeyHex)
    return { installId: existing.installId, privateKeyHex: existing.privateKeyHex }

  await gandalfStore.set({
    installId: credentials.installId,
    privateKeyHex: credentials.privateKeyHex,
  })

  log.debug("Gandalf: registered with installId", credentials.installId)
  return credentials
}
