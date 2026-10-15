import { describe, expect, it } from "vitest"

import { MIN_ALARM_DELAY_MS, planWake } from "./scheduler"

const NOW = 1_000_000_000
const MINUTE = 60_000
const DELAY = 7 * MINUTE

describe("planWake", () => {
  it.each([
    ["nothing queued, no alarm", [], undefined, { type: "keep" }],
    ["nothing queued, an alarm", [], NOW + MINUTE, { type: "clear" }],
    [
      "a shifted time far enough away",
      [NOW + 5 * MINUTE, NOW + 9 * MINUTE],
      undefined,
      { type: "schedule", at: NOW + 5 * MINUTE },
    ],
    [
      "due rows and a later shifted time",
      [NOW - MINUTE, NOW + 9 * MINUTE],
      undefined,
      { type: "schedule", at: NOW + 9 * MINUTE },
    ],
    [
      "an alarm already set before the shifted time",
      [NOW + 9 * MINUTE],
      NOW + 2 * MINUTE,
      { type: "keep" },
    ],
    [
      "an alarm set after the shifted time",
      [NOW + 5 * MINUTE],
      NOW + 9 * MINUTE,
      { type: "schedule", at: NOW + 5 * MINUTE },
    ],
    [
      "only due rows, no alarm: a random delay past the minimum",
      [NOW - MINUTE, NOW + 10_000],
      undefined,
      { type: "schedule", at: NOW + MIN_ALARM_DELAY_MS + DELAY },
    ],
    ["only due rows, a pending alarm", [NOW - MINUTE], NOW + 4 * MINUTE, { type: "keep" }],
    [
      "only due rows, an alarm in the past",
      [NOW - MINUTE],
      NOW - 1,
      { type: "schedule", at: NOW + MIN_ALARM_DELAY_MS + DELAY },
    ],
  ] as const)("%s", (_, sendTimes, scheduledAt, expected) => {
    expect(planWake({ sendTimes, now: NOW, scheduledAt, drawDelay: () => DELAY })).toEqual(expected)
  })

  it("never wakes at now plus the minimum delay alone", () => {
    for (const sendTimes of [[NOW], [NOW - MINUTE], [NOW + MIN_ALARM_DELAY_MS - 1]]) {
      const plan = planWake({ sendTimes, now: NOW, scheduledAt: undefined, drawDelay: () => DELAY })
      expect(plan).toEqual({ type: "schedule", at: NOW + MIN_ALARM_DELAY_MS + DELAY })
    }
  })
})
