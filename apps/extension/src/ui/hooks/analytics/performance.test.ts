import { describe, expect, it } from "vitest"

import {
  type BalancesLoadEvent,
  type BalancesLoadTiming,
  INITIAL_BALANCES_LOAD_PHASE,
  stepBalancesLoad,
} from "./performance"

const run = (events: BalancesLoadEvent[]) => {
  let phase = INITIAL_BALANCES_LOAD_PHASE
  const timings: BalancesLoadTiming[] = []
  for (const event of events) {
    const step = stepBalancesLoad(phase, event)
    phase = step.phase
    if (step.timing) timings.push(step.timing)
  }
  return timings
}

const unlocked = (at: number) => ({ type: "unlocked" as const, at })
const initialising = (value: boolean, at: number) => ({ type: "initialising" as const, value, at })

describe("stepBalancesLoad", () => {
  it.each([
    [
      "from the unlock to balances loaded",
      [unlocked(100), initialising(true, 150), initialising(false, 1100)],
      [{ duration_ms: 1000, ready_at_unlock: false }],
    ],
    [
      "already loaded at the unlock",
      [initialising(false, 50), unlocked(100)],
      [{ duration_ms: 0, ready_at_unlock: true }],
    ],
    [
      "once per page: a later reload of balances is not measured",
      [unlocked(0), initialising(false, 500), initialising(true, 600), initialising(false, 900)],
      [{ duration_ms: 500, ready_at_unlock: false }],
    ],
    [
      "the first unlock counts, not a later one",
      [unlocked(0), unlocked(400), initialising(false, 500)],
      [{ duration_ms: 500, ready_at_unlock: false }],
    ],
    ["never unlocked", [initialising(true, 0), initialising(false, 10)], []],
    ["never loaded", [unlocked(0), initialising(true, 10)], []],
  ])("%s", (_, events, timings) => {
    expect(run(events)).toEqual(timings)
  })
})
