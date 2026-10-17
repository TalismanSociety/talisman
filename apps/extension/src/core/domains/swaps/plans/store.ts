import { db } from "@core/db"
import type { WalletTransaction } from "@core/domains/transactions/types"

import type { NonEmpty } from "../types"
import { derivePhase, findIntermediateConflict, PROPOSED_TTL_MS, transition } from "./machine"
import type {
  PlanEffect,
  PlanEvent,
  PlanLeg,
  PlanPhase,
  PlanSummary,
  SwapPlan,
  SwapPlanId,
} from "./types"

/** terminal plans are kept this long for the activity view */
export const PLAN_RETENTION_MS = 30 * 24 * 60 * 60_000

const LIVE_PHASES: PlanPhase[] = ["proposed", "running", "paused"]
const TERMINAL_PHASES: PlanPhase[] = ["completed", "stopped", "aborted"]

const queues = new Map<SwapPlanId, Promise<unknown>>()

/** Every write to a plan runs here, one at a time per plan, so no writer ever works from a stale read */
export const enqueue = <T>(planId: SwapPlanId, work: () => Promise<T>): Promise<T> => {
  const previous = queues.get(planId) ?? Promise.resolve()
  const run = previous.then(work, work)
  queues.set(planId, run)
  const settle = () => {
    if (queues.get(planId) === run) queues.delete(planId)
  }
  run.then(settle, settle)
  return run
}

export const getPlan = (id: SwapPlanId) => db.swapPlans.get(id)

export const getLivePlans = () => db.swapPlans.where("phase").anyOf(LIVE_PHASES).toArray()

/** the phase is derived from the legs on every write, the stored field only serves the index */
export const putPlan = (plan: SwapPlan) =>
  db.swapPlans.put({ ...plan, phase: derivePhase(plan.legs) })

export type AppliedEvent = { plan: SwapPlan; effects: PlanEffect[] }

/** Applies an event to the stored plan on its queue. Null when the plan does not exist */
export const applyPlanEvent = (
  id: SwapPlanId,
  event: PlanEvent,
  now: number
): Promise<AppliedEvent | null> =>
  enqueue(id, async () => {
    const plan = await db.swapPlans.get(id)
    if (!plan) return null
    const result = transition(plan, event, now)
    if (result.plan !== plan) await putPlan(result.plan)
    return result
  })

export type PlanProposal = {
  id: SwapPlanId
  legs: NonEmpty<PlanLeg>
  summary: PlanSummary
  intermediate: string
}

export class PlanProposalRejected extends Error {
  readonly name = "PlanProposalRejected"
}

/**
 * Creates the plan. Its legs never change, so leg 0's signature names the legs the user approved.
 * Rejected while another live plan holds the same intermediate account.
 */
export const proposePlan = (proposal: PlanProposal, now: number): Promise<SwapPlan> =>
  enqueue(proposal.id, () =>
    db.transaction("rw", db.swapPlans, async () => {
      if (await db.swapPlans.get(proposal.id))
        throw new PlanProposalRejected("The swap was already proposed")

      if (findIntermediateConflict(await getLivePlans(), proposal))
        throw new PlanProposalRejected("Another swap is using that account")

      const plan: SwapPlan = {
        id: proposal.id,
        phase: "proposed",
        createdAt: now,
        updatedAt: now,
        signUntil: null,
        summary: proposal.summary,
        intermediate: proposal.intermediate,
        legs: proposal.legs,
      }
      await putPlan(plan)
      return plan
    })
  )

/** Expires the proposed plans nobody signed, and prunes the terminal plans past their retention */
export const sweepPlans = async (now: number) => {
  const proposed = await db.swapPlans.where("phase").equals("proposed").toArray()
  for (const plan of proposed)
    if (now - plan.updatedAt >= PROPOSED_TTL_MS)
      await applyPlanEvent(plan.id, { type: "expired" }, now)

  await db.swapPlans
    .where("phase")
    .anyOf(TERMINAL_PHASES)
    .filter((plan) => now - plan.updatedAt >= PLAN_RETENTION_MS)
    .delete()
}

/** The ids of the plans that are not over yet: their transaction rows are the plan's evidence */
export const getLivePlanIds = async (): Promise<Set<string>> =>
  new Set(await db.swapPlans.where("phase").anyOf(LIVE_PHASES).primaryKeys())

export const isRowOfLivePlan = (row: WalletTransaction, liveIds: Set<string>) =>
  !!row.txInfo?.plan && liveIds.has(row.txInfo.plan.id)
