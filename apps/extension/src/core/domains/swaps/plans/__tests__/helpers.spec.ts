import { describe, expect, it } from "vitest"

import { deriveLegInput } from "../helpers"
import type { SwapPlan } from "../types"
import { LEG0, LEG0_OUTPUT, LEG1, PLAN_ID, SUMMARY, T0 } from "./fixtures"

const ED_WEI = 500_000_000_000n

const plan = (landed: bigint): SwapPlan => ({
  id: PLAN_ID,
  phase: "running",
  createdAt: T0,
  updatedAt: T0,
  signUntil: T0 + 1,
  summary: SUMMARY,
  intermediate: LEG1.quote.signer,
  legs: [
    {
      ...LEG0,
      state: {
        at: "landed",
        hash: `0x${"11".repeat(32)}`,
        amount: landed.toString(),
        landedAt: T0,
      },
    },
    { ...LEG1, state: { at: "building", attempt: 1, nextAttemptAt: T0 } },
  ],
})

describe("deriveLegInput", () => {
  it("spends what landed when the signer holds more", () => {
    expect(deriveLegInput(plan(LEG0_OUTPUT - 1n), 1, 5n * 10n ** 18n)).toBe(LEG0_OUTPUT - 1n)
  })

  it("never spends above the quoted input", () => {
    expect(deriveLegInput(plan(LEG0_OUTPUT + 1n), 1, 5n * 10n ** 18n)).toBe(LEG0_OUTPUT)
  })

  it("keeps the existential deposit on Bittensor EVM", () => {
    expect(deriveLegInput(plan(LEG0_OUTPUT), 1, LEG0_OUTPUT)).toBe(LEG0_OUTPUT - ED_WEI)
  })
})
