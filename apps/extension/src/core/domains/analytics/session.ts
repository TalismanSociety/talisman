import { v7 } from "uuid"

import type { AnalyticsSession, WireTime } from "./types"

// PostHog's own limits
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60_000
export const SESSION_MAX_DURATION_MS = 24 * 60 * 60_000
export const MAX_OFFSET_MS = 15 * 60_000

export const shift = (realMs: number, offsetMs: number) => (realMs + offsetMs) as WireTime

export const realTime = (realMs: number) => realMs as WireTime

export const drawOffsetMs = () =>
  Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (MAX_OFFSET_MS + 1))

export const uuidv7 = (at: WireTime, random = crypto.getRandomValues(new Uint8Array(16))) =>
  v7({ msecs: at, random })

export const advanceSession = (
  current: AnalyticsSession | null,
  realNow: number,
  drawOffset: () => number
): { session: AnalyticsSession; at: WireTime } => {
  const live =
    current !== null &&
    realNow >= current.startedAt &&
    realNow - current.lastActivityAt < SESSION_IDLE_TIMEOUT_MS

  if (live && realNow - current.startedAt < SESSION_MAX_DURATION_MS)
    return {
      session: { ...current, lastActivityAt: Math.max(realNow, current.lastActivityAt) },
      at: shift(realNow, current.offsetMs),
    }

  const offsetMs = live ? current.offsetMs : drawOffset()
  const at = shift(realNow, offsetMs)
  return {
    // PostHog requires the id's time to be at or before the session's first event
    session: { id: uuidv7(at), offsetMs, startedAt: realNow, lastActivityAt: realNow },
    at,
  }
}
