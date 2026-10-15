import { describe, expect, it } from "vitest"

import {
  advanceSession,
  MAX_OFFSET_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_DURATION_MS,
  shift,
  uuidv7,
} from "./session"
import type { AnalyticsSession } from "./types"

const MINUTE = 60_000
const T0 = Date.UTC(2026, 9, 2, 12)

const uuidTime = (uuid: string) => Number.parseInt(uuid.replaceAll("-", "").slice(0, 12), 16)

const session = (overrides: Partial<AnalyticsSession> = {}): AnalyticsSession => ({
  id: uuidv7(shift(T0, 5 * MINUTE)),
  offsetMs: 5 * MINUTE,
  startedAt: T0,
  lastActivityAt: T0,
  ...overrides,
})

const freshOffset = () => 11 * MINUTE

describe("advanceSession", () => {
  it.each([
    ["no session yet", null, T0, "new", 11 * MINUTE],
    ["an event 29 min after the last", session(), T0 + 29 * MINUTE, "same", 5 * MINUTE],
    ["an event 30 min after the last", session(), T0 + SESSION_IDLE_TIMEOUT_MS, "new", 11 * MINUTE],
    [
      "24 h of activity",
      session({ lastActivityAt: T0 + SESSION_MAX_DURATION_MS - MINUTE }),
      T0 + SESSION_MAX_DURATION_MS,
      "new",
      11 * MINUTE,
    ],
    ["a clock set back before the start", session(), T0 - MINUTE, "new", 11 * MINUTE],
  ] as const)("%s: %s session, offset %i", (_, current, realNow, expected, offsetMs) => {
    const { session: next, at } = advanceSession(current, realNow, freshOffset)

    expect(next.id === current?.id ? "same" : "new").toBe(expected)
    expect(next.offsetMs).toBe(offsetMs)
    expect(at).toBe(realNow + offsetMs)
    expect(next.lastActivityAt).toBe(realNow)
  })

  it("mints the session id from the session's first shifted time, never the real clock", () => {
    const { session: next, at } = advanceSession(null, T0, freshOffset)

    expect(uuidTime(next.id)).toBe(at)
    expect(uuidTime(next.id)).not.toBe(T0)
  })
})

describe("uuidv7", () => {
  it("embeds the given time and is a valid version 7 uuid", () => {
    const at = shift(T0, 7 * MINUTE)
    const uuid = uuidv7(at)

    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(uuidTime(uuid)).toBe(at)
  })

  it("keeps no state between calls: the same input gives the same uuid", () => {
    const random = new Uint8Array(16).fill(7)
    const at = shift(T0, 0)

    expect(uuidv7(at, random)).toBe(uuidv7(at, random))
  })
})

describe("idle rotation", () => {
  it("starts the new session after the old session's tail, whatever the offsets", () => {
    const old = session({ offsetMs: MAX_OFFSET_MS })
    const tail = shift(old.lastActivityAt, old.offsetMs)

    const { at } = advanceSession(old, old.lastActivityAt + SESSION_IDLE_TIMEOUT_MS, () => 0)

    expect(at).toBeGreaterThan(tail)
  })
})
