import { log } from "@common/log"
import { db } from "@core/db"
import { passwordStore } from "@core/domains/app/store.password"
import { settingsStore } from "@core/domains/app/store.settings"
import {
  markPlanTransactionDropped,
  type TxStatusFact,
  txStatusFacts$,
  updateTransactionStatus,
} from "@core/domains/transactions/store.transactions"
import { watchSwapStatus } from "@core/domains/transactions/watchSwapStatus"
import { createNotification } from "@core/notifications"
import { networkIdFromTokenId } from "@talismn/chaindata-provider"
import { filter, firstValueFrom } from "rxjs"
import type { Hex } from "viem"

import { legCandidates } from "../candidates"
import type { SwapEnv } from "../env"
import { coreSwapEnv } from "../env.core"
import { getBackgroundSwapModule, getPlanLegRuntime } from "../registry"
import type {
  BackgroundSwapModule,
  BuiltLeg,
  LegObservation,
  PlanLegRuntime,
  SentLeg,
  SupportedSwapProtocol,
} from "../types"
import { broadcastRaw } from "./broadcast"
import { deriveLegInput, fromPersistedLeg, readLegBalance } from "./helpers"
import { dueEffects, isAdmissible, isTerminalPhase } from "./machine"
import { type SignOutcome, signAndBroadcast } from "./sign"
import { applyPlanEvent, type BeforePut, getLivePlans, getPlan, sweepPlans } from "./store"
import type {
  LegState,
  PlanEffect,
  PlanEvent,
  PlanLeg,
  SwapPlan,
  SwapPlanId,
  SwapPlanRef,
} from "./types"

export type PlanNotificationKind = "needs-you" | "stopped" | "completed"

export type ExecutorDeps = {
  env: SwapEnv
  getModule: (protocol: SupportedSwapProtocol) => BackgroundSwapModule
  getRuntime: (protocol: SupportedSwapProtocol) => PlanLegRuntime
  sign: (ref: SwapPlanRef, built: BuiltLeg) => Promise<SignOutcome>
  isUnlocked: () => Promise<boolean>
  notify: (kind: PlanNotificationKind, plan: SwapPlan) => Promise<void>
  /** the periodic alarm is kept only while some leg is building or sent */
  setAlarm: (needed: boolean) => Promise<void>
  /** resends signed bytes whose leg is still pending */
  broadcast: (networkId: string, raw: Hex) => Promise<void>
  /** follows a landed leg's swap status, the delivery of a cross-chain leg, for as long as it takes */
  trackDelivery: (hash: Hex) => Promise<void>
  now: () => number
  /** a point between two effects: tests inject a crash here */
  checkpoint?: (label: string) => Promise<void>
}

const isProviderUnavailable = (err: unknown) =>
  (err as { name?: string }).name === "SwapProviderUnavailableError"

type RowOutcome = "success" | "error" | "replaced" | "dropped" | "unknown"

/** the row of one transaction on a settled leg's nonce: only the one that executed takes the verdict */
const rowOutcome = (verdict: LegState, hash: Hex): RowOutcome | null => {
  const executed = "hash" in verdict && verdict.hash === hash
  if (verdict.at === "landed") return executed ? "success" : "replaced"
  if (verdict.at !== "failed") return null
  switch (verdict.failure) {
    case "reverted":
      return executed ? "error" : "replaced"
    case "cancelled":
      return executed ? "success" : "replaced"
    case "replaced":
      return "replaced"
    case "dropped":
      return "dropped"
    case "indeterminate":
      return "unknown"
    default:
      return null
  }
}

/**
 * Runs a plan's effects. Every write goes through the per-plan queue, every read is fresh, and a
 * drive that fails stops where it is: the next wake starts again from the stored plan.
 */
export const createSwapPlanExecutor = (deps: ExecutorDeps) => {
  const inFlight = new Map<SwapPlanId, { promise: Promise<void>; again: boolean }>()

  const checkpoint = (label: string) => deps.checkpoint?.(label) ?? Promise.resolve()

  const sentLegOf = async (leg: PlanLeg): Promise<SentLeg | null> => {
    if (leg.state.at !== "sent" || leg.nonce === undefined) return null
    const { hash, sentAt, evidence } = leg.state
    const row = (await db.transactionsV2.get(hash)) ?? null
    return { hash, nonce: leg.nonce, sentAt, evidence, row }
  }

  const settleRow = async (hash: Hex, outcome: RowOutcome) => {
    switch (outcome) {
      case "success":
        await updateTransactionStatus(hash, "success", undefined, true)
        return
      case "error":
        await updateTransactionStatus(hash, "error", undefined, true)
        return
      case "replaced":
        await updateTransactionStatus(hash, "replaced", undefined, true)
        return
      case "dropped":
        await markPlanTransactionDropped(hash)
        return
      case "unknown":
        await updateTransactionStatus(hash, "unknown")
        return
    }
  }

  /** a restart leaves the rows unknown: the leg's verdict from the chain settles each of them */
  const settleRows = async (before: LegState, verdict: LegState) => {
    if (before.at !== "sent") return
    for (const { hash } of legCandidates(before)) {
      const outcome = rowOutcome(verdict, hash)
      if (outcome) await settleRow(hash, outcome)
    }
    if (verdict.at === "landed")
      deps
        .trackDelivery(verdict.hash)
        .catch((err) =>
          log.warn("Failed to track a swap plan leg's delivery", { err, hash: verdict.hash })
        )
  }

  /**
   * The rows first, then the plan, both on the plan's queue so no replacement is admitted in
   * between: a crash in between observes the leg again
   */
  const settle = (id: SwapPlanId, index: number, event: PlanEvent) =>
    applyAndFollow(id, event, (before, after) =>
      settleRows(before.legs[index].state, after.legs[index].state)
    )

  const applyAndFollow = async (id: SwapPlanId, event: PlanEvent, beforePut?: BeforePut) => {
    const result = await applyPlanEvent(id, event, deps.now(), beforePut)
    if (!result) return
    for (const effect of result.effects) await runEffect(result.plan, effect)
  }

  /**
   * Writes the pause, then reads the login state again: an unlock in between found no paused plan,
   * so this resumes it. A second "unlocked" leaves the plan as it is.
   */
  const pauseForUnlock = async (id: SwapPlanId, index: number) => {
    const paused = await applyPlanEvent(
      id,
      { type: "paused", leg: index, why: "unlock" },
      deps.now()
    )
    if (await deps.isUnlocked()) return applyAndFollow(id, { type: "unlocked" })
    if (!paused) return
    for (const effect of paused.effects) await runEffect(paused.plan, effect)
  }

  const observe = async (id: SwapPlanId, index: number) => {
    const plan = await getPlan(id)
    const leg = plan?.legs[index]
    if (!plan || leg?.state.at !== "sent") return
    const sent = await sentLegOf(leg)
    if (!sent) return

    const runtime = deps.getRuntime(leg.quote.protocol)
    const { deadlineAt } = leg.state
    const pastDeadline = () => deps.now() >= deadlineAt
    const deadline: PlanEvent = { type: "deadline", leg: index }
    let observation: LegObservation
    try {
      observation = await runtime.observeLeg(
        { leg: fromPersistedLeg(leg.quote), sent, handsOver: index < plan.legs.length - 1 },
        deps.env
      )
    } catch (err) {
      log.warn("Failed to observe a swap plan leg", { err, id, leg: index })
      if (pastDeadline()) return settle(id, index, deadline)
      return
    }
    await checkpoint(`observed:${index}`)

    const observed: PlanEvent = {
      type: "observed",
      leg: index,
      observation,
      candidates: legCandidates(leg.state).length,
    }
    if (observation.status !== "pending") return settle(id, index, observed)
    if (observation.scanned?.length) await applyAndFollow(id, observed)
    if (pastDeadline()) return settle(id, index, deadline)
    for (const { raw } of legCandidates(leg.state).reverse())
      if (raw)
        await deps
          .broadcast(networkIdFromTokenId(leg.quote.fromTokenId), raw)
          .catch((err) => log.debug("Swap plan leg resend failed", { err, id, leg: index }))
  }

  const buildAndSign = async (id: SwapPlanId, index: number) => {
    const plan = await getPlan(id)
    const leg = plan?.legs[index]
    if (!plan || leg?.state.at !== "building") return
    if (!isAdmissible(plan, index, deps.now())) return applyAndFollow(id, { type: "expired" })
    if (!(await deps.isUnlocked())) return pauseForUnlock(id, index)

    const module = deps.getModule(leg.quote.protocol)
    const networkId = networkIdFromTokenId(leg.quote.fromTokenId)
    let built: BuiltLeg
    try {
      const client = await deps.env.evmClient(networkId)
      const balance = await readLegBalance(client, leg.quote)
      built = await module.buildLeg(
        {
          leg: fromPersistedLeg(leg.quote),
          input: deriveLegInput(plan, index, balance),
          context: { platform: "ethereum" },
          slippage: plan.summary.slippage,
        },
        deps.env
      )
    } catch (err) {
      log.warn("Failed to build a swap plan leg", { err, id, leg: index })
      return applyAndFollow(id, {
        type: "build-failed",
        leg: index,
        failure: isProviderUnavailable(err) ? "provider-unavailable" : "transient",
      })
    }
    await checkpoint(`built:${index}`)
    if (built.acceptedOutput !== undefined)
      return applyAndFollow(id, { type: "paused", leg: index, why: "signature" })

    const outcome = await deps.sign({ id, leg: index }, built)
    await checkpoint(`signed:${index}`)
    switch (outcome.type) {
      case "sent":
      case "stale":
        return
      case "locked":
        return pauseForUnlock(id, index)
      case "out-of-bounds":
        log.warn("A swap plan leg broke its bound", {
          id,
          leg: index,
          violation: outcome.violation,
        })
        return applyAndFollow(id, { type: "build-failed", leg: index, failure: "out-of-bounds" })
      case "failed":
        log.warn("Failed to sign a swap plan leg", { err: outcome.error, id, leg: index })
        return applyAndFollow(id, { type: "build-failed", leg: index, failure: "transient" })
    }
  }

  const runEffect = async (plan: SwapPlan, effect: PlanEffect) => {
    switch (effect.type) {
      case "notify":
        return deps
          .notify(effect.kind, plan)
          .catch((err) => log.warn("Failed to notify about a swap plan", { err, id: plan.id }))
      case "observe":
        return observe(plan.id, effect.leg)
      case "build-and-sign":
        return buildAndSign(plan.id, effect.leg)
    }
  }

  const reconcileAlarm = async () => {
    const live = await getLivePlans()
    const needed = live.some((plan) =>
      plan.legs.some((leg) => leg.state.at === "sent" || leg.state.at === "building")
    )
    await deps
      .setAlarm(needed)
      .catch((err) => log.warn("Failed to set the swap plans alarm", { err }))
  }

  const driveOnce = async (id: SwapPlanId) => {
    const plan = await getPlan(id)
    if (!plan || isTerminalPhase(plan.phase)) return
    for (const effect of dueEffects(plan, deps.now())) await runEffect(plan, effect)
  }

  /** Runs the plan's due effects, once at a time per plan. A wake during a drive queues one more */
  const drive = (id: SwapPlanId): Promise<void> => {
    const current = inFlight.get(id)
    if (current) {
      current.again = true
      return current.promise
    }
    const entry = { again: false, promise: Promise.resolve() }
    entry.promise = (async () => {
      try {
        await driveOnce(id)
      } finally {
        inFlight.delete(id)
        await reconcileAlarm()
      }
      if (entry.again) await drive(id)
    })()
    inFlight.set(id, entry)
    return entry.promise
  }

  const driveQuietly = (id: SwapPlanId) =>
    drive(id).catch((err) => log.error("Failed to drive a swap plan", { err, id }))

  const driveAllLive = async () => {
    await Promise.all((await getLivePlans()).map((plan) => driveQuietly(plan.id)))
  }

  /** at service worker start: sweep, then pick every live plan up where it was */
  const resumeAll = async () => {
    await sweepPlans(deps.now())
    await driveAllLive()
  }

  const isWaitingForUnlock = (plan: SwapPlan) =>
    plan.legs.some((leg) => leg.state.at === "awaiting-user" && leg.state.why === "unlock")

  const onUnlock = async () => {
    const waiting = (await getLivePlans()).filter(isWaitingForUnlock)
    await Promise.all(
      waiting.map((plan) =>
        applyAndFollow(plan.id, { type: "unlocked" })
          .catch((err) => log.error("Failed to resume a swap plan", { err, id: plan.id }))
          .finally(reconcileAlarm)
      )
    )
  }

  const onRowFact = (fact: TxStatusFact) => {
    const ref = fact.row.txInfo?.plan
    if (ref) driveQuietly(ref.id)
  }

  return { drive, driveQuietly, resumeAll, tick: driveAllLive, onUnlock, onRowFact }
}

const ALARM_NAME = "swap-plans"
const ALARM_PERIOD_MINUTES = 0.5

const coreDeps: ExecutorDeps = {
  env: coreSwapEnv,
  getModule: getBackgroundSwapModule,
  getRuntime: getPlanLegRuntime,
  sign: signAndBroadcast,
  isUnlocked: async () =>
    (await firstValueFrom(
      passwordStore.isLoggedIn.pipe(filter((value) => value !== "UNKNOWN"))
    )) === "TRUE",
  notify: async (kind, plan) => {
    if (!(await settingsStore.get("allowNotifications"))) return
    await createNotification(
      `swap-plan-${kind}`,
      "",
      chrome.runtime.getURL(`popup.html#/swap-plan/${plan.id}`)
    )
  },
  setAlarm: async (needed) => {
    if (needed) await chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES })
    else await chrome.alarms.clear(ALARM_NAME)
  },
  broadcast: broadcastRaw,
  trackDelivery: watchSwapStatus,
  now: Date.now,
}

export const swapPlanExecutor = createSwapPlanExecutor(coreDeps)

/** from `initDb`, after the transaction cleanups */
export const resumeSwapPlans = () => swapPlanExecutor.resumeAll()

/** Call at the service worker's top level, or Chrome does not wake the worker for the alarm */
export const startSwapPlanExecutor = () => {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) swapPlanExecutor.tick()
  })
  passwordStore.isLoggedIn.subscribe((value) => {
    if (value === "TRUE") swapPlanExecutor.onUnlock()
  })
  txStatusFacts$.subscribe(swapPlanExecutor.onRowFact)
}
