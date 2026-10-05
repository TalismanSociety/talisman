import { toDurationMs } from "@common/analytics/schema"
import { track } from "@ui/api/track"

export type BalancesLoadPhase = {
  unlockedAt: number | null
  initialising: boolean | null
  done: boolean
}

export type BalancesLoadEvent =
  | { type: "unlocked"; at: number }
  | { type: "initialising"; value: boolean; at: number }

export type BalancesLoadTiming = { duration_ms: number; ready_at_unlock: boolean }

export const INITIAL_BALANCES_LOAD_PHASE: BalancesLoadPhase = {
  unlockedAt: null,
  initialising: null,
  done: false,
}

export const stepBalancesLoad = (
  phase: BalancesLoadPhase,
  event: BalancesLoadEvent
): { phase: BalancesLoadPhase; timing?: BalancesLoadTiming } => {
  if (phase.done) return { phase }
  if (event.type === "unlocked") {
    if (phase.unlockedAt !== null) return { phase }
    if (phase.initialising === false)
      return {
        phase: { ...phase, unlockedAt: event.at, done: true },
        timing: { duration_ms: 0, ready_at_unlock: true },
      }
    return { phase: { ...phase, unlockedAt: event.at } }
  }
  const next = { ...phase, initialising: event.value }
  if (phase.unlockedAt === null || event.value) return { phase: next }
  return {
    phase: { ...next, done: true },
    timing: { duration_ms: toDurationMs(event.at - phase.unlockedAt), ready_at_unlock: false },
  }
}

let balancesLoad = INITIAL_BALANCES_LOAD_PHASE

const stepPage = (event: BalancesLoadEvent) => {
  const { phase, timing } = stepBalancesLoad(balancesLoad, event)
  balancesLoad = phase
  if (timing) track("balances_loaded", timing)
}

export const tapBalancesInitialising = (value: boolean) =>
  stepPage({ type: "initialising", value, at: performance.now() })

let startedLocked: boolean | null = null

export const tapLoggedIn = (loggedIn: boolean) => {
  startedLocked ??= !loggedIn
  if (loggedIn) stepPage({ type: "unlocked", at: performance.now() })
}

export const pageStartedLocked = () => startedLocked === true
