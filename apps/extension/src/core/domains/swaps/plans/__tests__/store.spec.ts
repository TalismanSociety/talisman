import { db } from "@core/db"
import { beforeEach, describe, expect, it } from "vitest"

import { PROPOSED_TTL_MS } from "../machine"
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
import type { PlanLeg, SwapPlan, SwapPlanId } from "../types"
import {
  ADMIT_LEG0,
  EVM_ADDRESS,
  LEG0,
  LEG0_HASH,
  LEG0_LANDED,
  LEG1,
  PLAN_ID,
  PROPOSAL,
  RECIPIENT,
  T0,
} from "./fixtures"

const OTHER_ID = "plan-2" as SwapPlanId

const signedBy = (signer: string): PlanLeg => ({ ...LEG1, quote: { ...LEG1.quote, signer } })

const PROPOSED: SwapPlan = {
  ...PROPOSAL,
  phase: "proposed",
  createdAt: T0,
  updatedAt: T0,
  signUntil: null,
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
        proposePlan(
          { ...PROPOSAL, id: OTHER_ID, legs: [LEG0, signedBy(EVM_ADDRESS.toLowerCase())] },
          T0
        )
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
      expect(admitted?.plan.phase).toBe("running")
      expect(admitted?.effects).toEqual([])
      expect(await db.swapPlans.get(PLAN_ID)).toEqual(admitted?.plan)

      const landed = await applyPlanEvent(PLAN_ID, LEG0_LANDED, T0 + 2_000)
      expect(landed?.effects).toEqual([{ type: "build-and-sign", leg: 1 }])
      expect(await db.swapPlans.get(PLAN_ID)).toEqual(landed?.plan)
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
            observation: { status: "landed", hash: LEG0_HASH, amount: 5n },
          },
          T0 + 2
        ),
      ])
      expect(admitted?.plan.legs[0].state.at).toBe("sent")
      expect(landed?.plan.legs[0].state).toEqual({
        at: "landed",
        hash: LEG0_HASH,
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
      await proposePlan(
        { ...PROPOSAL, id: OTHER_ID, legs: [LEG0, signedBy(RECIPIENT)] },
        T0 + 60_000
      )
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
