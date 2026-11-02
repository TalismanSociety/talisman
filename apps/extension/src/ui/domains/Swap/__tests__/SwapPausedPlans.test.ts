import {
  LEG0,
  LEG0_HASH,
  LEG1,
  PLAN_ID,
  SUMMARY,
  T0,
} from "@core/domains/swaps/plans/__tests__/fixtures"
import type { LegState, SwapPlan } from "@core/domains/swaps/plans/types"
import { describe, expect, it, vi } from "vitest"

import { pausedPlanFunds } from "../components/SwapPausedPlans"

vi.mock("@ui/api", () => ({ api: {} }))

const plan = (first: LegState, second: LegState): SwapPlan => ({
  id: PLAN_ID,
  phase: "paused",
  createdAt: T0,
  updatedAt: T0,
  signUntil: T0 + 1,
  summary: SUMMARY,
  legs: [
    { ...LEG0, state: first },
    { ...LEG1, state: second },
  ],
})

describe("pausedPlanFunds", () => {
  it("is what the leg before delivered, on the account that signs the waiting leg", () => {
    const landed: LegState = { at: "landed", hash: LEG0_HASH, amount: "1234", landedAt: T0 }
    const waiting: LegState = { at: "awaiting-user", why: "signature", since: T0 }

    expect(pausedPlanFunds(plan(landed, waiting))).toEqual({
      tokenId: LEG1.quote.fromTokenId,
      address: LEG1.quote.signer,
      amount: 1234n,
    })
  })
})
