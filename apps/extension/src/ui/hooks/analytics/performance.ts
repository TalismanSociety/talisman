import { toDurationMs } from "@common/analytics/schema"
import { track } from "@ui/api/track"

export type BalancesLoadPhase = {
  /** performance.now() when this page first saw the wallet unlocked. */
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

/**
 * Mobile's measureBalancesLoad: from the first unlock seen to the first time balances read not
 * initialising, `ready_at_unlock` when they already did at the unlock. Once per page.
 */
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

/** A passive tap: pages that never show balances never start fetching them for this. */
export const tapBalancesInitialising = (value: boolean) =>
  stepPage({ type: "initialising", value, at: performance.now() })

let startedLocked: boolean | null = null

/** A tap on the page's login state. */
export const tapLoggedIn = (loggedIn: boolean) => {
  startedLocked ??= !loggedIn
  if (loggedIn) stepPage({ type: "unlocked", at: performance.now() })
}

/** The page showed the unlock screen first. */
export const pageStartedLocked = () => startedLocked === true
