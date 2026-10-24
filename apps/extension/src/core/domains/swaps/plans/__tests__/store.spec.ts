import { db } from "@core/db"
import { beforeEach, describe, expect, it } from "vitest"

import { PROPOSED_TTL_MS, SIGN_WINDOW_MS } from "../machine"
import {
  applyPlanEvent,
  enqueue,
  getLivePlanIds,
  PLAN_RETENTION_MS,
  PlanProposalRejected,
  proposePlan,
  putPlan,
  sweepPlans,
  takeProposalArrival,
} from "../store"
import type { PlanLeg, PlanSummary, SwapPlan, SwapPlanId } from "../types"

const PLAN_ID = "plan-1" as SwapPlanId
const OTHER_ID = "plan-2" as SwapPlanId
const SUB_ADDRESS = "5GW7UHZ9tLocJUaMXFWkr48QHgVoq5tVR1az62mknFacM3cu"
const EVM_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
const RECIPIENT = "0x70045A9F59A354550EC0272f73AAe03B01Fb8a7a"
const HASH0 = `0x${"11".repeat(32)}` as const
const T0 = 1_700_000_000_000

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
  bound: {
    platform: "ethereum",
    chainId: 964,
    signer: EVM_ADDRESS,
    to: "0xd5Fa238aa4177f6c1341491969d9cBeec94EEd69",
    calls: [{ template: "0x12345678", amountSlots: [3, 5], maxNetworkFee: "2100000000000000" }],
    floor: "980100000000000000",
    maxSpend: "999999500000000000",
  },
  state: { at: "queued" },
}

const SUMMARY: PlanSummary = {
  fromTokenId: LEG0.quote.fromTokenId,
  toTokenId: LEG1.quote.toTokenId,
  fromAmount: "1000000000",
  quotedOutput: "990000000000000000",
  recipient: RECIPIENT,
  protocol: "forevermoney",
  slippage: 0.005,
}

const PROPOSAL = {
  id: PLAN_ID,
  legs: [LEG0, LEG1] as [PlanLeg, PlanLeg],
  summary: SUMMARY,
  intermediate: EVM_ADDRESS,
}

const ADMIT_LEG0 = {
  type: "admitted",
  leg: 0,
  hash: HASH0,
  nonce: 7,
  deadlineAt: T0 + 20 * 60_000,
  evidence: { platform: "polkadot", era: { birth: 100, period: 64 } },
} as const

const PROPOSED: SwapPlan = {
  id: PLAN_ID,
  phase: "proposed",
  createdAt: T0,
  updatedAt: T0,
  signUntil: null,
  summary: SUMMARY,
  intermediate: EVM_ADDRESS,
  legs: [LEG0, LEG1],
}

describe("swap plan store", () => {
  beforeEach(async () => {
    await db.swapPlans.clear()
  })

  describe("proposePlan", () => {
    it("creates a proposed plan", async () => {
      expect(await proposePlan(PROPOSAL, T0)).toEqual(PROPOSED)
      expect(await db.swapPlans.get(PLAN_ID)).toEqual(PROPOSED)
    })

    it("never changes the legs of a proposed plan", async () => {
      await proposePlan(PROPOSAL, T0)
      const leg0 = { ...LEG0, nonce: 8 }
      await expect(proposePlan({ ...PROPOSAL, legs: [leg0, LEG1] }, T0 + 5_000)).rejects.toThrow(
        new PlanProposalRejected("The swap was already proposed")
      )
      expect(await db.swapPlans.get(PLAN_ID)).toEqual(PROPOSED)
    })

    it("rejects a re-propose once leg 0 was admitted", async () => {
      await proposePlan(PROPOSAL, T0)
      await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0 + 1_000)
      await expect(proposePlan(PROPOSAL, T0 + 2_000)).rejects.toThrow(
        new PlanProposalRejected("The swap was already proposed")
      )
    })

    it("rejects a plan while another started plan holds the intermediate", async () => {
      await proposePlan(PROPOSAL, T0)
      await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0 + 1_000)
      await expect(
        proposePlan({ ...PROPOSAL, id: OTHER_ID, intermediate: EVM_ADDRESS.toLowerCase() }, T0)
      ).rejects.toThrow(new PlanProposalRejected("Another swap is using that account"))
      expect(await db.swapPlans.count()).toBe(1)
    })

    it("supersedes another proposed plan on the same intermediate", async () => {
      await proposePlan(PROPOSAL, T0)
      const other = await proposePlan({ ...PROPOSAL, id: OTHER_ID }, T0 + 2)
      expect(other.phase).toBe("proposed")
      expect((await db.swapPlans.get(PLAN_ID))?.phase).toBe("aborted")
      expect(await getLivePlanIds()).toEqual(new Set([OTHER_ID]))
    })

    it("rejects a proposal that arrived before the proposed plan on its intermediate", async () => {
      const earlier = takeProposalArrival()
      await proposePlan({ ...PROPOSAL, id: OTHER_ID }, T0)
      await expect(proposePlan(PROPOSAL, T0, earlier)).rejects.toThrow(
        new PlanProposalRejected("A newer swap is using that account")
      )
      expect(await getLivePlanIds()).toEqual(new Set([OTHER_ID]))
    })

    it("supersedes a plan proposed before a restart, whatever the clock said then", async () => {
      await putPlan({ ...PROPOSED, createdAt: T0 + 60_000, updatedAt: T0 + 60_000 })
      const other = await proposePlan({ ...PROPOSAL, id: OTHER_ID }, T0)
      expect(other.phase).toBe("proposed")
      expect((await db.swapPlans.get(PLAN_ID))?.phase).toBe("aborted")
    })

    it("accepts the intermediate of a plan that is over", async () => {
      await proposePlan(PROPOSAL, T0)
      await applyPlanEvent(PLAN_ID, { type: "cancelled" }, T0 + 1)
      const other = await proposePlan({ ...PROPOSAL, id: OTHER_ID }, T0 + 2)
      expect(other.phase).toBe("proposed")
      expect(await getLivePlanIds()).toEqual(new Set([OTHER_ID]))
    })
  })

  describe("applyPlanEvent", () => {
    it("stores the transitioned plan and returns its effects", async () => {
      await proposePlan(PROPOSAL, T0)
      const admitted = await applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0 + 1_000)
      expect(admitted).toEqual({
        plan: {
          ...PROPOSED,
          phase: "running",
          updatedAt: T0 + 1_000,
          signUntil: T0 + 1_000 + SIGN_WINDOW_MS,
          legs: [
            {
              ...LEG0,
              state: {
                at: "sent",
                hash: HASH0,
                sentAt: T0 + 1_000,
                deadlineAt: T0 + 20 * 60_000,
                evidence: { platform: "polkadot", era: { birth: 100, period: 64 } },
              },
            },
            LEG1,
          ],
        },
        effects: [],
      })

      const landed = await applyPlanEvent(
        PLAN_ID,
        {
          type: "observed",
          leg: 0,
          candidates: 1,
          observation: { status: "landed", hash: HASH0, amount: 999999500000000000n },
        },
        T0 + 2_000
      )
      expect(landed?.effects).toEqual([{ type: "build-and-sign", leg: 1 }])
      expect((await db.swapPlans.get(PLAN_ID))?.legs[1].state).toEqual({
        at: "building",
        attempt: 1,
        nextAttemptAt: T0 + 2_000,
      })
    })

    it("returns null for an unknown plan", async () => {
      expect(await applyPlanEvent(OTHER_ID, { type: "cancelled" }, T0)).toBe(null)
    })

    it("serialises concurrent writers so none works from a stale read", async () => {
      await proposePlan(PROPOSAL, T0)
      const [admitted, landed] = await Promise.all([
        applyPlanEvent(PLAN_ID, ADMIT_LEG0, T0 + 1),
        applyPlanEvent(
          PLAN_ID,
          {
            type: "observed",
            leg: 0,
            candidates: 1,
            observation: { status: "landed", hash: HASH0, amount: 5n },
          },
          T0 + 2
        ),
      ])
      expect(admitted?.plan.legs[0].state.at).toBe("sent")
      expect(landed?.plan.legs[0].state).toEqual({
        at: "landed",
        hash: HASH0,
        amount: "5",
        landedAt: T0 + 2,
      })
      expect((await db.swapPlans.get(PLAN_ID))?.phase).toBe("running")
    })
  })

  describe("enqueue", () => {
    it("runs the next job after a failed one", async () => {
      const failed = enqueue(PLAN_ID, async () => {
        throw new Error("boom")
      })
      const next = enqueue(PLAN_ID, async () => "ran")
      await expect(failed).rejects.toThrow("boom")
      expect(await next).toBe("ran")
    })

    it("keeps plans independent", async () => {
      const order: string[] = []
      const slow = enqueue(PLAN_ID, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20))
        order.push("slow")
      })
      const fast = enqueue(OTHER_ID, async () => {
        order.push("fast")
      })
      await Promise.all([slow, fast])
      expect(order).toEqual(["fast", "slow"])
    })
  })

  describe("putPlan", () => {
    it("derives the phase from the legs", async () => {
      await putPlan({ ...PROPOSED, phase: "running" })
      expect((await db.swapPlans.get(PLAN_ID))?.phase).toBe("proposed")
    })
  })

  describe("sweepPlans", () => {
    it("expires a proposed plan nobody signed and keeps a fresh one", async () => {
      await proposePlan(PROPOSAL, T0)
      await proposePlan({ ...PROPOSAL, id: OTHER_ID, intermediate: RECIPIENT }, T0 + 60_000)
      await sweepPlans(T0 + PROPOSED_TTL_MS)
      expect((await db.swapPlans.get(PLAN_ID))?.phase).toBe("aborted")
      expect((await db.swapPlans.get(PLAN_ID))?.legs[0].state).toEqual({
        at: "failed",
        failure: "expired",
        failedAt: T0 + PROPOSED_TTL_MS,
      })
      expect((await db.swapPlans.get(OTHER_ID))?.phase).toBe("proposed")
    })

    it("prunes a terminal plan after its retention and keeps a live one", async () => {
      await proposePlan(PROPOSAL, T0)
      await applyPlanEvent(PLAN_ID, { type: "cancelled" }, T0)
      await proposePlan({ ...PROPOSAL, id: OTHER_ID }, T0)
      await applyPlanEvent(OTHER_ID, ADMIT_LEG0, T0)

      await sweepPlans(T0 + PLAN_RETENTION_MS - 1)
      expect(await db.swapPlans.count()).toBe(2)

      await sweepPlans(T0 + PLAN_RETENTION_MS)
      expect((await db.swapPlans.toArray()).map((plan) => plan.id)).toEqual([OTHER_ID])
    })
  })
})
