import { log } from "@common/log"
import type { Loadable } from "@talismn/util"
import { Observable, shareReplay, startWith, switchMap, timer } from "rxjs"

import { registerInstall, requestAccessToken } from "./client"
import { gandalfStore } from "./store"

/** Refresh tokens every 4 minutes (tokens last 5 min, this gives 1 min buffer). */
const REFRESH_INTERVAL_MS = 4 * 60 * 1000

// ── In-memory token cache ─────────────────────────────────────────────────────

let cachedAccessToken: string | null = null
let cachedExpiresAt = 0 // unix-ms of when the cached token expires

/** Minimum remaining lifetime (ms) below which we consider a token stale. */
const EXPIRY_BUFFER_MS = 60 * 1000

function getCachedTokenIfValid(): string | null {
  if (cachedAccessToken && Date.now() < cachedExpiresAt - EXPIRY_BUFFER_MS) {
    return cachedAccessToken
  }
  return null
}

/**
 * Ensures the install is registered with Gandalf.
 * Returns stored credentials if they exist, otherwise performs one-time registration.
 */
async function ensureRegistered(
  signal?: AbortSignal
): Promise<{ installId: string; privateKeyHex: string }> {
  const { installId, privateKeyHex } = await gandalfStore.get()

  if (installId && privateKeyHex) return { installId, privateKeyHex }

  log.debug("Gandalf: no install credentials found, registering…")
  const credentials = await registerInstall(signal)

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

/**
 * Observable that emits a valid Gandalf access token (JWT string).
 *
 * - On first subscribe, registers if needed (inc. PoW solve).
 * - Refreshes the token every 4 minutes, but only if there are active subscribers.
 * - Returns the cached token immediately when it's still valid.
 * - Emits `Loadable<string>` with status loading/success/error.
 */
export const gandalfAccessToken$ = timer(0, REFRESH_INTERVAL_MS).pipe(
  switchMap(
    () =>
      new Observable<Loadable<string>>((subscriber) => {
        // If we already have a valid token, re-emit it without hitting the API
        const cached = getCachedTokenIfValid()
        if (cached) {
          subscriber.next({ status: "success", data: cached })
          subscriber.complete()
          return
        }

        const controller = new AbortController()
        subscriber.add(() => controller.abort())

        const run = async () => {
          try {
            const { installId, privateKeyHex } = await ensureRegistered(controller.signal)
            if (controller.signal.aborted) return

            const { accessToken, expiresIn } = await requestAccessToken(
              installId,
              privateKeyHex,
              controller.signal
            )
            if (controller.signal.aborted) return

            // Cache for future ticks
            cachedAccessToken = accessToken
            cachedExpiresAt = Date.now() + expiresIn * 1000

            subscriber.next({ status: "success", data: accessToken })
            subscriber.complete()
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") return

            log.error("Gandalf: failed to obtain access token", error)
            subscriber.next({
              status: "error",
              error: {
                message: error instanceof Error ? error.message : "Failed to obtain access token",
              },
            } as Loadable<string>)
            subscriber.complete()
          }
        }

        run()
      })
  ),
  startWith({ status: "loading" } as Loadable<string>),
  shareReplay({ bufferSize: 1, refCount: true })
)
