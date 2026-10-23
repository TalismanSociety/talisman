import { isAddressEqual } from "@talismn/crypto"
import type { Hex } from "viem"

import type { NonEmpty } from "../types"
import type {
  LegFailure,
  PlanEffect,
  PlanEvent,
  PlanLeg,
  PlanPhase,
  SwapPlan,
  SwapPlanId,
} from "./types"

/** how long after leg 0 is admitted the background may still sign a later leg */
export const SIGN_WINDOW_MS = 30 * 60_000
/** how long a proposed plan waits for leg 0 to be signed */
export const PROPOSED_TTL_MS = 30 * 60_000
export const MAX_BUILD_ATTEMPTS = 5
const BUILD_BACKOFF_BASE_MS = 30_000

/** a leg 0 that provably never moved funds aborts the plan, every other failure stops it */
const ABORT_FAILURES: readonly LegFailure[] = ["dropped", "reverted", "cancelled", "expired"]

const NOTIFY_STOPPED: PlanEffect = { type: "notify", kind: "stopped" }
const NOTIFY_NEEDS_YOU: PlanEffect = { type: "notify", kind: "needs-you" }

type Legs = NonEmpty<PlanLeg>

type Step = {
  legs: Legs
  effects: PlanEffect[]
  patch?: Partial<Pick<SwapPlan, "signUntil">>
}

export const isTerminalPhase = (phase: PlanPhase) =>
  phase === "completed" || phase === "stopped" || phase === "aborted"

export const derivePhase = (legs: Legs): PlanPhase => {
  if (legs[0].state.at === "queued") return "proposed"
  if (legs.every((leg) => leg.state.at === "landed")) return "completed"

  const failedIndex = legs.findIndex((leg) => leg.state.at === "failed")
  if (failedIndex !== -1) {
    const failed = legs[failedIndex].state
    return failedIndex === 0 && failed.at === "failed" && ABORT_FAILURES.includes(failed.failure)
      ? "aborted"
      : "stopped"
  }

  if (legs.some((leg) => leg.state.at === "awaiting-user")) return "paused"
  return "running"
}

const isSignWindowOpen = (plan: SwapPlan, now: number) =>
  plan.signUntil === null || now <= plan.signUntil

/** the background signs a building leg only inside the sign window, the user signs a hardware one */
export const isAdmissible = (plan: SwapPlan, index: number, now: number): boolean => {
  const leg = plan.legs[index]
  if (!leg || isTerminalPhase(plan.phase)) return false
  if (index === 0) return leg.state.at === "queued"
  return (
    (leg.state.at === "building" && isSignWindowOpen(plan, now)) ||
    (leg.state.at === "awaiting-user" && leg.state.why === "hardware")
  )
}

/** the id of a live plan that already holds `intermediate`, null when it is free */
export const findIntermediateConflict = (
  plans: readonly SwapPlan[],
  proposal: { intermediate: string }
): SwapPlanId | null =>
  plans.find(
    (plan) =>
      !isTerminalPhase(plan.phase) && isAddressEqual(plan.intermediate, proposal.intermediate)
  )?.id ?? null

const replaceLeg = (legs: Legs, index: number, leg: PlanLeg): Legs =>
  legs.map((current, i) => (i === index ? leg : current)) as Legs

const failLeg = (legs: Legs, index: number, failure: LegFailure, now: number, hash?: Hex): Legs =>
  legs.map((leg, i) => {
    if (i === index)
      return {
        ...leg,
        state: hash
          ? { at: "failed" as const, failure, hash, failedAt: now }
          : { at: "failed" as const, failure, failedAt: now },
      }
    if (i > index) return { ...leg, state: { at: "skipped" as const } }
    return leg
  }) as Legs

const stop = (legs: Legs, index: number, failure: LegFailure, now: number, hash?: Hex): Step => ({
  legs: failLeg(legs, index, failure, now, hash),
  effects: [NOTIFY_STOPPED],
})

/** leg `index` is next: the background builds it, or the user is asked, or the window has closed */
const makeDue = (plan: SwapPlan, legs: Legs, index: number, now: number): Step => {
  if (!isSignWindowOpen(plan, now)) return stop(legs, index, "expired", now)

  const leg = legs[index]
  if (leg.signerType !== "keypair" || leg.bound === null)
    return {
      legs: replaceLeg(legs, index, {
        ...leg,
        state: { at: "awaiting-user", why: "hardware", since: now },
      }),
      effects: [NOTIFY_NEEDS_YOU],
    }

  return {
    legs: replaceLeg(legs, index, {
      ...leg,
      state: { at: "building", attempt: 1, nextAttemptAt: now },
    }),
    effects: [{ type: "build-and-sign", leg: index }],
  }
}

const step = (plan: SwapPlan, event: PlanEvent, now: number): Step | null => {
  const { legs } = plan

  switch (event.type) {
    case "cancelled": {
      const index = legs.findIndex((leg) => leg.state.at !== "landed")
      const current = legs[index]
      if (!current || current.state.at === "sent") return null
      return { legs: failLeg(legs, index, "cancelled", now), effects: [] }
    }

    case "expired": {
      if (legs[0].state.at === "queued")
        return { legs: failLeg(legs, 0, "expired", now), effects: [] }
      const building = legs.findIndex((leg) => leg.state.at === "building")
      if (building === -1 || isSignWindowOpen(plan, now)) return null
      return stop(legs, building, "expired", now)
    }

    case "admitted": {
      if (!isAdmissible(plan, event.leg, now)) return null
      const leg = legs[event.leg]
      return {
        legs: replaceLeg(legs, event.leg, {
          ...leg,
          nonce: event.nonce,
          state: {
            at: "sent",
            hash: event.hash,
            sentAt: now,
            deadlineAt: event.deadlineAt,
            evidence: event.evidence,
          },
        }),
        patch: event.leg === 0 ? { signUntil: now + SIGN_WINDOW_MS } : undefined,
        effects: [],
      }
    }

    case "observed": {
      const leg = legs[event.leg]
      if (leg?.state.at !== "sent") return null
      const { hash } = leg.state
      const { observation } = event

      switch (observation.status) {
        case "pending": {
          const { evidence } = leg.state
          if (evidence.platform !== "polkadot" || !observation.scanned) return null
          const known = new Set(evidence.scanned)
          const fresh = observation.scanned.filter((number) => !known.has(number))
          if (!fresh.length) return null
          return {
            legs: replaceLeg(legs, event.leg, {
              ...leg,
              state: {
                ...leg.state,
                evidence: { ...evidence, scanned: [...(evidence.scanned ?? []), ...fresh] },
              },
            }),
            effects: [],
          }
        }
        case "landed": {
          const landed = replaceLeg(legs, event.leg, {
            ...leg,
            state: { at: "landed", hash, amount: observation.amount.toString(), landedAt: now },
          })
          if (event.leg === legs.length - 1)
            return { legs: landed, effects: [{ type: "notify", kind: "completed" }] }
          return makeDue(plan, landed, event.leg + 1, now)
        }
        case "dropped":
          return event.leg === 0 ? stop(legs, 0, "dropped", now, hash) : null
        case "failed":
          return stop(legs, event.leg, observation.reason, now, hash)
      }
      return null
    }

    case "deadline": {
      const leg = legs[event.leg]
      if (leg?.state.at !== "sent") return null
      return stop(legs, event.leg, "indeterminate", now, leg.state.hash)
    }

    case "build-failed": {
      const leg = legs[event.leg]
      if (leg?.state.at !== "building") return null
      if (event.failure !== "transient") return stop(legs, event.leg, event.failure, now)
      if (!isSignWindowOpen(plan, now)) return stop(legs, event.leg, "expired", now)
      const { attempt } = leg.state
      if (attempt >= MAX_BUILD_ATTEMPTS) return stop(legs, event.leg, "build-failed", now)
      return {
        legs: replaceLeg(legs, event.leg, {
          ...leg,
          state: {
            at: "building",
            attempt: attempt + 1,
            nextAttemptAt: now + BUILD_BACKOFF_BASE_MS * 2 ** (attempt - 1),
          },
        }),
        effects: [],
      }
    }

    case "locked": {
      const leg = legs[event.leg]
      if (leg?.state.at !== "building") return null
      return {
        legs: replaceLeg(legs, event.leg, {
          ...leg,
          state: { at: "awaiting-user", why: "unlock", since: now },
        }),
        effects: [NOTIFY_NEEDS_YOU],
      }
    }

    case "unlocked": {
      const index = legs.findIndex(
        (leg) => leg.state.at === "awaiting-user" && leg.state.why === "unlock"
      )
      if (index === -1) return null
      return makeDue(plan, legs, index, now)
    }
  }
}

const unchanged = (plan: SwapPlan) => ({ plan, effects: [] as PlanEffect[] })

/**
 * The plan's pure state machine. An event that does not match the plan's state, a replay or a
 * stale leg index, returns the same plan object, so a crash replay converges.
 */
export const transition = (
  plan: SwapPlan,
  event: PlanEvent,
  now: number
): { plan: SwapPlan; effects: PlanEffect[] } => {
  if (isTerminalPhase(plan.phase)) return unchanged(plan)

  const result = step(plan, event, now)
  if (!result) return unchanged(plan)

  return {
    plan: {
      ...plan,
      ...result.patch,
      legs: result.legs,
      phase: derivePhase(result.legs),
      updatedAt: now,
    },
    effects: result.effects,
  }
}

/** the work a live plan has at `now`: observe every sent leg, build every leg whose attempt is due */
export const dueEffects = (plan: SwapPlan, now: number): PlanEffect[] => {
  if (isTerminalPhase(plan.phase)) return []
  return plan.legs.flatMap((leg, index): PlanEffect[] => {
    if (leg.state.at === "sent") return [{ type: "observe", leg: index }]
    if (leg.state.at === "building" && leg.state.nextAttemptAt <= now)
      return [{ type: "build-and-sign", leg: index }]
    return []
  })
}
