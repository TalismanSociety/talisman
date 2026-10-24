import type { LegBound, LegReplacement } from "@core/domains/swaps/types"
import { describe, expect, it } from "vitest"

import {
  dueEffects,
  findIntermediateConflict,
  isAdmissible,
  MAX_BUILD_ATTEMPTS,
  SIGN_WINDOW_MS,
  transition,
} from "../machine"
import type { PlanEvent, PlanLeg, SwapPlan, SwapPlanId } from "../types"

const PLAN_ID = "plan-1" as SwapPlanId
const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const GATEWAY = "0xd5Fa238aa4177f6c1341491969d9cBeec94EEd69"
const HASH0 = `0x${"11".repeat(32)}` as const
const HASH1 = `0x${"22".repeat(32)}` as const
const RAW1 = "0x02f8aa" as const
const T0 = 1_700_000_000_000
const T1 = T0 + 60_000
const LEG0_DEADLINE = T0 + 20 * 60_000
const LEG1_DEADLINE = T1 + 30 * 60_000

const BOUND: LegBound = {
  platform: "ethereum",
  chainId: 964,
  signer: EVM_ADDRESS,
  to: GATEWAY,
  calls: [{ template: "0x12345678", amountSlots: [3, 5], maxNetworkFee: "2100000000000000" }],
  floor: "980100000000000000",
  maxSpend: "999999500000000000",
}

const LEG0: PlanLeg = {
  quote: {
    protocol: "bittensor-evm",
    fromTokenId: "bittensor:substrate-native",
    toTokenId: "964:evm-native",
    signer: SUB_ADDRESS,
    recipient: EVM_ADDRESS,
    inputAmount: "1000000000",
    outputAmount: "999999500000000000",
    fees: [],
    timeInSec: 12,
  },
  signerType: "keypair",
  bound: null,
  nonce: 7,
  state: { at: "queued" },
}

const LEG1: PlanLeg = {
  quote: {
    protocol: "forevermoney",
    fromTokenId: "964:evm-native",
    toTokenId: "8453:evm-erc20:0xf3081494b87e8d5fb7960f066e931d1d0e6e3d67",
    signer: EVM_ADDRESS,
    recipient: RECIPIENT,
    inputAmount: "999999500000000000",
    outputAmount: "990000000000000000",
    fees: [],
    timeInSec: 180,
  },
  signerType: "keypair",
  bound: BOUND,
  state: { at: "queued" },
}

const SUMMARY: SwapPlan["summary"] = {
  fromTokenId: LEG0.quote.fromTokenId,
  toTokenId: LEG1.quote.toTokenId,
  fromAmount: "1000000000",
  quotedOutput: "990000000000000000",
  recipient: RECIPIENT,
  protocol: "forevermoney",
  subProtocol: "via-bittensor-evm",
  slippage: 0.005,
}

const PROPOSED: SwapPlan = {
  id: PLAN_ID,
  phase: "proposed",
  createdAt: T0 - 1_000,
  updatedAt: T0 - 1_000,
  signUntil: null,
  summary: SUMMARY,
  intermediate: EVM_ADDRESS,
  legs: [LEG0, LEG1],
}

const LEG0_SENT: PlanLeg = {
  ...LEG0,
  state: {
    at: "sent",
    hash: HASH0,
    sentAt: T0,
    deadlineAt: LEG0_DEADLINE,
    evidence: { platform: "polkadot", era: { birth: 100, period: 64 } },
  },
}

const RUNNING: SwapPlan = {
  ...PROPOSED,
  phase: "running",
  updatedAt: T0,
  signUntil: T0 + SIGN_WINDOW_MS,
  legs: [LEG0_SENT, LEG1],
}

const LEG0_LANDED: PlanLeg = {
  ...LEG0,
  state: { at: "landed", hash: HASH0, amount: "999999500000000000", landedAt: T1 },
}

const withLeg1 = (plan: SwapPlan, leg1: PlanLeg, updatedAt: number): SwapPlan => ({
  ...plan,
  updatedAt,
  legs: [LEG0_LANDED, leg1],
})

const BUILDING: SwapPlan = {
  ...withLeg1(RUNNING, { ...LEG1, state: { at: "building", attempt: 1, nextAttemptAt: T1 } }, T1),
}

const HARDWARE: SwapPlan = {
  ...BUILDING,
  legs: [LEG0_LANDED, { ...LEG1, state: { at: "awaiting-user", why: "hardware", since: T1 } }],
}

const LEG1_SENT: PlanLeg = {
  ...LEG1,
  nonce: 12,
  state: {
    at: "sent",
    hash: HASH1,
    sentAt: T1,
    deadlineAt: LEG1_DEADLINE,
    evidence: { platform: "ethereum", raw: RAW1 },
  },
}

const LEG1_RUNNING: SwapPlan = withLeg1(RUNNING, LEG1_SENT, T1)

const ADMIT_LEG1 = {
  type: "admitted",
  leg: 1,
  hash: HASH1,
  nonce: 12,
  deadlineAt: LEG1_DEADLINE,
  evidence: { platform: "ethereum", raw: RAW1 },
} as const

describe("a proposed plan", () => {
  it("runs once leg 0 is admitted and opens the signing window", () => {
    expect(
      transition(
        PROPOSED,
        {
          type: "admitted",
          leg: 0,
          hash: HASH0,
          nonce: 7,
          deadlineAt: LEG0_DEADLINE,
          evidence: { platform: "polkadot", era: { birth: 100, period: 64 } },
        },
        T0
      )
    ).toEqual({ plan: RUNNING, effects: [] })
  })

  it("aborts when cancelled", () => {
    expect(transition(PROPOSED, { type: "cancelled" }, T0)).toEqual({
      plan: {
        ...PROPOSED,
        phase: "aborted",
        updatedAt: T0,
        legs: [
          { ...LEG0, state: { at: "failed", failure: "cancelled", failedAt: T0 } },
          { ...LEG1, state: { at: "skipped" } },
        ],
      },
      effects: [],
    })
  })

  it("aborts when it expires", () => {
    expect(transition(PROPOSED, { type: "expired" }, T0)).toEqual({
      plan: {
        ...PROPOSED,
        phase: "aborted",
        updatedAt: T0,
        legs: [
          { ...LEG0, state: { at: "failed", failure: "expired", failedAt: T0 } },
          { ...LEG1, state: { at: "skipped" } },
        ],
      },
      effects: [],
    })
  })
})

describe("a sent leg", () => {
  it("stays as it is while pending", () => {
    const result = transition(
      RUNNING,
      { type: "observed", leg: 0, observation: { status: "pending" } },
      T1
    )
    expect(result.plan).toBe(RUNNING)
    expect(result.effects).toEqual([])
  })

  it("keeps the blocks a pending observation read without the extrinsic, each once", () => {
    const pendingAfter = (scanned: number[]): PlanEvent => ({
      type: "observed",
      leg: 0,
      observation: { status: "pending", scanned },
    })

    const first = transition(RUNNING, pendingAfter([163, 162]), T1)
    expect(first).toEqual({
      plan: {
        ...RUNNING,
        updatedAt: T1,
        legs: [
          {
            ...LEG0_SENT,
            state: {
              ...LEG0_SENT.state,
              evidence: {
                platform: "polkadot",
                era: { birth: 100, period: 64 },
                scanned: [163, 162],
              },
            },
          },
          LEG1,
        ],
      },
      effects: [],
    })

    const second = transition(first.plan, pendingAfter([162, 161]), T1 + 1)
    expect(second.plan.legs[0].state).toMatchObject({ evidence: { scanned: [163, 162, 161] } })
    expect(transition(second.plan, pendingAfter([161]), T1 + 2).plan).toBe(second.plan)
  })

  it("makes a keypair next leg due when it lands", () => {
    expect(
      transition(
        RUNNING,
        {
          type: "observed",
          leg: 0,
          observation: { status: "landed", hash: HASH0, amount: 999999500000000000n },
        },
        T1
      )
    ).toEqual({ plan: BUILDING, effects: [{ type: "build-and-sign", leg: 1 }] })
  })

  it("stops with expired when it lands after the signing window", () => {
    const now = T0 + SIGN_WINDOW_MS + 1
    expect(
      transition(
        RUNNING,
        {
          type: "observed",
          leg: 0,
          observation: { status: "landed", hash: HASH0, amount: 999999500000000000n },
        },
        now
      )
    ).toEqual({
      plan: {
        ...RUNNING,
        phase: "stopped",
        updatedAt: now,
        legs: [
          { ...LEG0_LANDED, state: { ...LEG0_LANDED.state, landedAt: now } },
          { ...LEG1, state: { at: "failed", failure: "expired", failedAt: now } },
        ],
      },
      effects: [{ type: "notify", kind: "stopped" }],
    })
  })

  it("hands a hardware next leg to the user when it lands", () => {
    const plan: SwapPlan = {
      ...RUNNING,
      legs: [LEG0_SENT, { ...LEG1, signerType: "ledger-ethereum" }],
    }
    expect(
      transition(
        plan,
        {
          type: "observed",
          leg: 0,
          observation: { status: "landed", hash: HASH0, amount: 999999500000000000n },
        },
        T1
      )
    ).toEqual({
      plan: {
        ...plan,
        phase: "paused",
        updatedAt: T1,
        pausedFor: "hardware",
        legs: [
          LEG0_LANDED,
          {
            ...LEG1,
            signerType: "ledger-ethereum",
            state: { at: "awaiting-user", why: "hardware", since: T1 },
          },
        ],
      },
      effects: [{ type: "notify", kind: "needs-you" }],
    })
  })

  it("hands an unbound next leg to the user when it lands", () => {
    const plan: SwapPlan = { ...RUNNING, legs: [LEG0_SENT, { ...LEG1, bound: null }] }
    const result = transition(
      plan,
      {
        type: "observed",
        leg: 0,
        observation: { status: "landed", hash: HASH0, amount: 999999500000000000n },
      },
      T1
    )
    expect(result.plan.legs[1].state).toEqual({ at: "awaiting-user", why: "hardware", since: T1 })
    expect(result.plan.phase).toBe("paused")
  })

  it("completes the plan when the last leg lands", () => {
    const now = T1 + 10_000
    expect(
      transition(
        LEG1_RUNNING,
        {
          type: "observed",
          leg: 1,
          observation: { status: "landed", hash: HASH1, amount: 985000000000000000n },
        },
        now
      )
    ).toEqual({
      plan: {
        ...LEG1_RUNNING,
        phase: "completed",
        updatedAt: now,
        legs: [
          LEG0_LANDED,
          {
            ...LEG1_SENT,
            state: { at: "landed", hash: HASH1, amount: "985000000000000000", landedAt: now },
          },
        ],
      },
      effects: [{ type: "notify", kind: "completed" }],
    })
  })

  it("aborts when leg 0 is proven dropped", () => {
    expect(
      transition(RUNNING, { type: "observed", leg: 0, observation: { status: "dropped" } }, T1)
    ).toEqual({
      plan: {
        ...RUNNING,
        phase: "aborted",
        updatedAt: T1,
        legs: [
          { ...LEG0, state: { at: "failed", failure: "dropped", hash: HASH0, failedAt: T1 } },
          { ...LEG1, state: { at: "skipped" } },
        ],
      },
      effects: [{ type: "notify", kind: "stopped" }],
    })
  })

  it("never lets a later leg become dropped", () => {
    const result = transition(
      LEG1_RUNNING,
      { type: "observed", leg: 1, observation: { status: "dropped" } },
      T1 + 10_000
    )
    expect(result.plan).toBe(LEG1_RUNNING)
    expect(result.effects).toEqual([])
  })

  it("aborts when leg 0 reverts", () => {
    const result = transition(
      RUNNING,
      {
        type: "observed",
        leg: 0,
        observation: { status: "failed", reason: "reverted", hash: HASH0 },
      },
      T1
    )
    expect(result.plan.phase).toBe("aborted")
    expect(result.plan.legs).toEqual([
      { ...LEG0, state: { at: "failed", failure: "reverted", hash: HASH0, failedAt: T1 } },
      { ...LEG1, state: { at: "skipped" } },
    ])
    expect(result.effects).toEqual([{ type: "notify", kind: "stopped" }])
  })

  it("stops when a later leg reverts", () => {
    const now = T1 + 10_000
    expect(
      transition(
        LEG1_RUNNING,
        {
          type: "observed",
          leg: 1,
          observation: { status: "failed", reason: "reverted", hash: HASH1 },
        },
        now
      )
    ).toEqual({
      plan: {
        ...LEG1_RUNNING,
        phase: "stopped",
        updatedAt: now,
        legs: [
          LEG0_LANDED,
          {
            ...LEG1_SENT,
            state: { at: "failed", failure: "reverted", hash: HASH1, failedAt: now },
          },
        ],
      },
      effects: [{ type: "notify", kind: "stopped" }],
    })
  })

  it("stops, never aborts, when leg 0 is indeterminate", () => {
    const result = transition(
      RUNNING,
      { type: "observed", leg: 0, observation: { status: "failed", reason: "indeterminate" } },
      T1
    )
    expect(result.plan.phase).toBe("stopped")
    expect(result.plan.legs[0].state).toEqual({
      at: "failed",
      failure: "indeterminate",
      hash: HASH0,
      failedAt: T1,
    })
    expect(result.plan.legs[1].state).toEqual({ at: "skipped" })
  })

  it("stops when a later leg is replaced", () => {
    const result = transition(
      LEG1_RUNNING,
      { type: "observed", leg: 1, observation: { status: "failed", reason: "replaced" } },
      T1
    )
    expect(result.plan.phase).toBe("stopped")
    expect(result.plan.legs[1].state).toEqual({
      at: "failed",
      failure: "replaced",
      hash: HASH1,
      failedAt: T1,
    })
  })

  it("is indeterminate past its deadline", () => {
    expect(transition(LEG1_RUNNING, { type: "deadline", leg: 1 }, LEG1_DEADLINE)).toEqual({
      plan: {
        ...LEG1_RUNNING,
        phase: "stopped",
        updatedAt: LEG1_DEADLINE,
        legs: [
          LEG0_LANDED,
          {
            ...LEG1_SENT,
            state: { at: "failed", failure: "indeterminate", hash: HASH1, failedAt: LEG1_DEADLINE },
          },
        ],
      },
      effects: [{ type: "notify", kind: "stopped" }],
    })
  })

  it("ignores a deadline for a leg that is not sent", () => {
    const result = transition(BUILDING, { type: "deadline", leg: 1 }, T1)
    expect(result.plan).toBe(BUILDING)
  })

  it("ignores an observation of a leg that is not sent", () => {
    const result = transition(
      BUILDING,
      { type: "observed", leg: 1, observation: { status: "landed", hash: HASH1, amount: 1n } },
      T1
    )
    expect(result.plan).toBe(BUILDING)
  })
})

describe("a building leg", () => {
  it("backs off after a transient build failure", () => {
    expect(
      transition(BUILDING, { type: "build-failed", leg: 1, failure: "transient" }, T1)
    ).toEqual({
      plan: withLeg1(
        RUNNING,
        { ...LEG1, state: { at: "building", attempt: 2, nextAttemptAt: T1 + 30_000 } },
        T1
      ),
      effects: [],
    })
  })

  it("doubles the backoff on each attempt", () => {
    const plan = withLeg1(
      RUNNING,
      { ...LEG1, state: { at: "building", attempt: 4, nextAttemptAt: T1 } },
      T1
    )
    const result = transition(plan, { type: "build-failed", leg: 1, failure: "transient" }, T1)
    expect(result.plan.legs[1].state).toEqual({
      at: "building",
      attempt: 5,
      nextAttemptAt: T1 + 240_000,
    })
  })

  it("stops after the last transient attempt", () => {
    const plan = withLeg1(
      RUNNING,
      { ...LEG1, state: { at: "building", attempt: MAX_BUILD_ATTEMPTS, nextAttemptAt: T1 } },
      T1
    )
    expect(transition(plan, { type: "build-failed", leg: 1, failure: "transient" }, T1)).toEqual({
      plan: {
        ...plan,
        phase: "stopped",
        legs: [
          LEG0_LANDED,
          { ...LEG1, state: { at: "failed", failure: "build-failed", failedAt: T1 } },
        ],
      },
      effects: [{ type: "notify", kind: "stopped" }],
    })
  })

  it("stops with expired when a retry falls after the signing window", () => {
    const now = T0 + SIGN_WINDOW_MS + 1
    const result = transition(BUILDING, { type: "build-failed", leg: 1, failure: "transient" }, now)
    expect(result.plan.phase).toBe("stopped")
    expect(result.plan.legs[1].state).toEqual({ at: "failed", failure: "expired", failedAt: now })
  })

  it("stops with no tx sent when the build breaks the bound", () => {
    expect(
      transition(BUILDING, { type: "build-failed", leg: 1, failure: "out-of-bounds" }, T1)
    ).toEqual({
      plan: {
        ...BUILDING,
        phase: "stopped",
        legs: [
          LEG0_LANDED,
          { ...LEG1, state: { at: "failed", failure: "out-of-bounds", failedAt: T1 } },
        ],
      },
      effects: [{ type: "notify", kind: "stopped" }],
    })
  })

  it("stops when the provider is unavailable", () => {
    const result = transition(
      BUILDING,
      { type: "build-failed", leg: 1, failure: "provider-unavailable" },
      T1
    )
    expect(result.plan.phase).toBe("stopped")
    expect(result.plan.legs[1].state).toEqual({
      at: "failed",
      failure: "provider-unavailable",
      failedAt: T1,
    })
  })

  it("waits for the unlock when the wallet is locked", () => {
    expect(transition(BUILDING, { type: "locked", leg: 1 }, T1)).toEqual({
      plan: {
        ...BUILDING,
        phase: "paused",
        pausedFor: "unlock",
        legs: [LEG0_LANDED, { ...LEG1, state: { at: "awaiting-user", why: "unlock", since: T1 } }],
      },
      effects: [{ type: "notify", kind: "needs-you" }],
    })
  })

  it("is sent once admitted", () => {
    expect(transition(BUILDING, ADMIT_LEG1, T1)).toEqual({ plan: LEG1_RUNNING, effects: [] })
  })

  it("stops when cancelled before admission", () => {
    expect(transition(BUILDING, { type: "cancelled" }, T1)).toEqual({
      plan: {
        ...BUILDING,
        phase: "stopped",
        legs: [
          LEG0_LANDED,
          { ...LEG1, state: { at: "failed", failure: "cancelled", failedAt: T1 } },
        ],
      },
      effects: [],
    })
  })

  it("ignores a build failure for a leg that is not building", () => {
    const result = transition(RUNNING, { type: "build-failed", leg: 1, failure: "transient" }, T1)
    expect(result.plan).toBe(RUNNING)
  })
})

describe("a paused plan", () => {
  const PAUSED_UNLOCK: SwapPlan = {
    ...BUILDING,
    phase: "paused",
    legs: [LEG0_LANDED, { ...LEG1, state: { at: "awaiting-user", why: "unlock", since: T1 } }],
  }
  const PAUSED_HARDWARE: SwapPlan = {
    ...BUILDING,
    phase: "paused",
    legs: [
      LEG0_LANDED,
      {
        ...LEG1,
        signerType: "ledger-ethereum",
        state: { at: "awaiting-user", why: "hardware", since: T1 },
      },
    ],
  }

  it("builds again once unlocked", () => {
    const now = T1 + 5_000
    expect(transition(PAUSED_UNLOCK, { type: "unlocked" }, now)).toEqual({
      plan: {
        ...PAUSED_UNLOCK,
        phase: "running",
        updatedAt: now,
        legs: [LEG0_LANDED, { ...LEG1, state: { at: "building", attempt: 1, nextAttemptAt: now } }],
      },
      effects: [{ type: "build-and-sign", leg: 1 }],
    })
  })

  it("stops with expired when unlocked after the signing window", () => {
    const now = T0 + SIGN_WINDOW_MS + 1
    const result = transition(PAUSED_UNLOCK, { type: "unlocked" }, now)
    expect(result.plan.phase).toBe("stopped")
    expect(result.plan.legs[1].state).toEqual({ at: "failed", failure: "expired", failedAt: now })
    expect(result.effects).toEqual([{ type: "notify", kind: "stopped" }])
  })

  it("ignores an unlock when nothing waits for it", () => {
    const result = transition(PAUSED_HARDWARE, { type: "unlocked" }, T1)
    expect(result.plan).toBe(PAUSED_HARDWARE)
  })

  it("is sent once the hardware leg is admitted", () => {
    const result = transition(PAUSED_HARDWARE, ADMIT_LEG1, T1)
    expect(result.plan.phase).toBe("running")
    expect(result.plan.legs[1]).toEqual({ ...LEG1_SENT, signerType: "ledger-ethereum" })
  })

  it("stops when cancelled while waiting", () => {
    const result = transition(PAUSED_HARDWARE, { type: "cancelled" }, T1)
    expect(result.plan.phase).toBe("stopped")
    expect(result.plan.legs[1].state).toEqual({ at: "failed", failure: "cancelled", failedAt: T1 })
  })
})

describe("replayed and stale events", () => {
  it("ignores a second admission with the same hash", () => {
    const result = transition(LEG1_RUNNING, ADMIT_LEG1, T1 + 1)
    expect(result.plan).toBe(LEG1_RUNNING)
    expect(result.effects).toEqual([])
  })

  it("ignores an admission of a queued leg", () => {
    const result = transition(RUNNING, ADMIT_LEG1, T1)
    expect(result.plan).toBe(RUNNING)
  })

  it("ignores a cancel while the current leg is sent", () => {
    const result = transition(LEG1_RUNNING, { type: "cancelled" }, T1)
    expect(result.plan).toBe(LEG1_RUNNING)
  })

  it("ignores every event on a terminal plan", () => {
    const completed = transition(
      LEG1_RUNNING,
      { type: "observed", leg: 1, observation: { status: "landed", hash: HASH1, amount: 1n } },
      T1
    ).plan
    for (const event of [
      { type: "cancelled" } as const,
      { type: "unlocked" } as const,
      { type: "deadline", leg: 1 } as const,
      {
        type: "observed",
        leg: 1,
        observation: { status: "failed", reason: "reverted", hash: HASH1 },
      } as const,
    ]) {
      expect(transition(completed, event, T1 + 1).plan).toBe(completed)
    }
  })
})

describe("dueEffects", () => {
  it("observes every sent leg", () => {
    expect(dueEffects(RUNNING, T1)).toEqual([{ type: "observe", leg: 0 }])
    expect(dueEffects(LEG1_RUNNING, T1)).toEqual([{ type: "observe", leg: 1 }])
  })

  it("builds a leg whose attempt is due", () => {
    expect(dueEffects(BUILDING, T1)).toEqual([{ type: "build-and-sign", leg: 1 }])
    expect(dueEffects(BUILDING, T1 - 1)).toEqual([])
  })

  it("has nothing to do for a paused or terminal plan", () => {
    const paused = transition(BUILDING, { type: "locked", leg: 1 }, T1).plan
    const aborted = transition(PROPOSED, { type: "cancelled" }, T0).plan
    expect(dueEffects(paused, T1)).toEqual([])
    expect(dueEffects(aborted, T1)).toEqual([])
    expect(dueEffects(PROPOSED, T0)).toEqual([])
  })
})

describe("isAdmissible", () => {
  it("admits leg 0 only while the plan is proposed", () => {
    expect(isAdmissible(PROPOSED, 0, T0)).toBe(true)
    expect(isAdmissible(RUNNING, 0, T0)).toBe(false)
  })

  it("admits a later leg only while it is building or waits for hardware", () => {
    expect(isAdmissible(RUNNING, 1, T1)).toBe(false)
    expect(isAdmissible(BUILDING, 1, T1)).toBe(true)
    expect(isAdmissible(transition(BUILDING, { type: "locked", leg: 1 }, T1).plan, 1, T1)).toBe(
      false
    )
    expect(isAdmissible(HARDWARE, 1, T1)).toBe(true)
    expect(isAdmissible(LEG1_RUNNING, 1, T1)).toBe(false)
  })

  it("admits a building leg only inside the sign window", () => {
    const signUntil = T0 + SIGN_WINDOW_MS
    expect(isAdmissible(BUILDING, 1, signUntil)).toBe(true)
    expect(isAdmissible(BUILDING, 1, signUntil + 1)).toBe(false)
  })

  it("lets the user sign a hardware leg after the sign window", () => {
    expect(isAdmissible(HARDWARE, 1, T0 + SIGN_WINDOW_MS + 1)).toBe(true)
  })
})

describe("a building leg when the sign window closes", () => {
  it("stops with expired", () => {
    const now = T0 + SIGN_WINDOW_MS + 1
    expect(transition(BUILDING, { type: "expired" }, now)).toEqual({
      plan: {
        ...BUILDING,
        phase: "stopped",
        updatedAt: now,
        legs: [
          LEG0_LANDED,
          { ...LEG1, state: { at: "failed", failure: "expired", failedAt: now } },
        ],
      },
      effects: [{ type: "notify", kind: "stopped" }],
    })
  })

  it("keeps building inside the window", () => {
    expect(transition(BUILDING, { type: "expired" }, T0 + SIGN_WINDOW_MS).plan).toBe(BUILDING)
  })

  it("refuses its admission", () => {
    const result = transition(BUILDING, ADMIT_LEG1, T0 + SIGN_WINDOW_MS + 1)
    expect(result.plan).toBe(BUILDING)
  })
})

describe("a sent EVM leg the user speeds up or cancels", () => {
  const SPEED_UP = {
    kind: "speed-up",
    hash: `0x${"33".repeat(32)}`,
    raw: "0x02f8bb",
    sentAt: T1,
  } as const
  const CANCEL = {
    kind: "cancel",
    hash: `0x${"44".repeat(32)}`,
    raw: "0x02f8cc",
    sentAt: T1,
  } as const
  const replaced = (replacement: LegReplacement, deadlineAt: number, leg = 1): PlanEvent => ({
    type: "replacement-admitted",
    leg,
    replacement,
    deadlineAt,
  })

  it("keeps each replacement once and waits for the latest deadline", () => {
    const later = LEG1_DEADLINE + 5_000
    const result = transition(LEG1_RUNNING, replaced(SPEED_UP, later), T1 + 1)
    expect(result.plan.legs[1].state).toEqual({
      ...LEG1_SENT.state,
      deadlineAt: later,
      evidence: { platform: "ethereum", raw: RAW1, replacements: [SPEED_UP] },
    })
    expect(result.effects).toEqual([])
    expect(transition(result.plan, replaced(SPEED_UP, later + 1), T1 + 2).plan).toBe(result.plan)

    const withCancel = transition(result.plan, replaced(CANCEL, T1), T1 + 3).plan
    expect(withCancel.legs[1].state).toMatchObject({
      deadlineAt: later,
      evidence: { replacements: [SPEED_UP, CANCEL] },
    })
  })

  it("ignores a replacement of a leg that is not sent, or not on an EVM network", () => {
    expect(transition(BUILDING, replaced(SPEED_UP, LEG1_DEADLINE), T1).plan).toBe(BUILDING)
    expect(transition(RUNNING, replaced(SPEED_UP, LEG0_DEADLINE, 0), T1).plan).toBe(RUNNING)
  })

  it("lands with the speed-up that executed", () => {
    const sped = transition(LEG1_RUNNING, replaced(SPEED_UP, LEG1_DEADLINE), T1 + 1).plan
    const now = T1 + 10_000
    const observation = { status: "landed", hash: SPEED_UP.hash, amount: 5n } as const
    const result = transition(sped, { type: "observed", leg: 1, observation }, now)
    expect(result.plan.phase).toBe("completed")
    expect(result.plan.legs[1].state).toEqual({
      at: "landed",
      hash: SPEED_UP.hash,
      amount: "5",
      landedAt: now,
    })
  })

  it("stops a later leg when the user's cancel executed", () => {
    const cancelled = transition(LEG1_RUNNING, replaced(CANCEL, LEG1_DEADLINE), T1 + 1).plan
    const now = T1 + 10_000
    const observation = { status: "failed", reason: "cancelled", hash: CANCEL.hash } as const
    const result = transition(cancelled, { type: "observed", leg: 1, observation }, now)
    expect(result.plan.phase).toBe("stopped")
    expect(result.plan.legs[1].state).toEqual({
      at: "failed",
      failure: "cancelled",
      hash: CANCEL.hash,
      failedAt: now,
    })
    expect(result.effects).toEqual([{ type: "notify", kind: "stopped" }])
  })

  it("aborts when the user's cancel executed on an EVM leg 0", () => {
    const evmLeg0: PlanLeg = {
      ...LEG0_SENT,
      state: {
        at: "sent",
        hash: HASH0,
        sentAt: T0,
        deadlineAt: LEG0_DEADLINE,
        evidence: { platform: "ethereum", raw: "0x02f8aa" },
      },
    }
    const plan = transition(
      { ...RUNNING, legs: [evmLeg0, LEG1] },
      replaced(CANCEL, LEG0_DEADLINE, 0),
      T1
    ).plan
    const observation = { status: "failed", reason: "cancelled", hash: CANCEL.hash } as const
    const result = transition(plan, { type: "observed", leg: 0, observation }, T1 + 1)
    expect(result.plan.phase).toBe("aborted")
    expect(result.plan.legs.map((leg) => leg.state)).toEqual([
      { at: "failed", failure: "cancelled", hash: CANCEL.hash, failedAt: T1 + 1 },
      { at: "skipped" },
    ])
  })

  it("names the latest transaction when its deadline passes", () => {
    const sped = transition(LEG1_RUNNING, replaced(SPEED_UP, LEG1_DEADLINE), T1 + 1).plan
    expect(
      transition(sped, { type: "deadline", leg: 1 }, LEG1_DEADLINE).plan.legs[1].state
    ).toEqual({
      at: "failed",
      failure: "indeterminate",
      hash: SPEED_UP.hash,
      failedAt: LEG1_DEADLINE,
    })
  })
})

describe("one plan per intermediate", () => {
  it("rejects a proposal while another plan holds the intermediate", () => {
    expect(findIntermediateConflict([RUNNING], { intermediate: EVM_ADDRESS.toLowerCase() })).toBe(
      PLAN_ID
    )
  })

  it("lets a terminal plan's intermediate go", () => {
    const aborted = transition(PROPOSED, { type: "cancelled" }, T0).plan
    expect(findIntermediateConflict([aborted], { intermediate: EVM_ADDRESS })).toBe(null)
  })

  it("lets a proposed plan's intermediate go", () => {
    expect(findIntermediateConflict([PROPOSED], { intermediate: EVM_ADDRESS })).toBe(null)
  })

  it("ignores a different intermediate", () => {
    expect(findIntermediateConflict([RUNNING], { intermediate: RECIPIENT })).toBe(null)
  })
})
