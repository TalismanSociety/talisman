import { useRef } from "react"

import type { EarnSystemId } from "../types"
import { seekSystem } from "./seekSystem"
import type {
  EarnActionOpener,
  EarnSystem,
  EarnSystemOpportunitiesResult,
  EarnSystemPositionsResult,
  EarnSystemProvidersResult,
} from "./types"
import { yieldxyzSystem } from "./yieldxyzSystem"

// Single source of truth for Earn systems. Keyed by EarnSystemId, so adding a value to that union
// makes this object a compile error ("Property 'dot' is missing") until the system is registered —
// that's the coverage guarantee that replaces the old silent `if/else if` fallthroughs.
const EARN_SYSTEMS_BY_ID: Record<EarnSystemId, EarnSystem> = {
  yieldxyz: yieldxyzSystem,
  seek: seekSystem,
}

// Fixed-order, fixed-length module constant — safe to call hooks over (rules of hooks require a
// stable call order, which a constant array guarantees).
export const EARN_SYSTEMS: readonly EarnSystem[] = Object.values(EARN_SYSTEMS_BY_ID)

export const getEarnSystem = (id: EarnSystemId): EarnSystem => EARN_SYSTEMS_BY_ID[id]

// Returns the same array reference across renders while its elements are referentially equal. Each
// system memoizes its result object, so this keeps the aggregated array stable when nothing changed
// — without it, the fresh array from `.map` would invalidate every downstream useMemo each render.
const useStableArray = <T>(next: T[]): T[] => {
  const ref = useRef(next)
  const prev = ref.current
  if (prev.length !== next.length || next.some((item, index) => item !== prev[index]))
    ref.current = next
  return ref.current
}

// The hook-iteration over the registry is centralized in the hooks below, so the aggregation sites
// (useEarnPositions, useEarnProviders, useEarnOpportunitiesByTokenId) and the dispatcher stay
// branch-free and never call hooks in a loop themselves.

export const useEarnSystemOpportunities = (): EarnSystemOpportunitiesResult[] => {
  // biome-ignore lint/correctness/useHookAtTopLevel: EARN_SYSTEMS is a fixed module constant, so the hook call order is stable across renders
  const results = EARN_SYSTEMS.map((system) => system.useOpportunities())
  return useStableArray(results)
}

export const useEarnSystemProviders = (): EarnSystemProvidersResult[] => {
  // biome-ignore lint/correctness/useHookAtTopLevel: EARN_SYSTEMS is a fixed module constant, so the hook call order is stable across renders
  const results = EARN_SYSTEMS.map((system) => system.useProviders())
  return useStableArray(results)
}

export const useEarnSystemPositions = (): EarnSystemPositionsResult[] => {
  // biome-ignore lint/correctness/useHookAtTopLevel: EARN_SYSTEMS is a fixed module constant, so the hook call order is stable across renders
  const results = EARN_SYSTEMS.map((system) => system.usePositions())
  return useStableArray(results)
}

export const useEarnSystemActionOpeners = (): Record<EarnSystemId, EarnActionOpener> => {
  const openersById = {} as Record<EarnSystemId, EarnActionOpener>
  // biome-ignore lint/correctness/useHookAtTopLevel: EARN_SYSTEMS is a fixed module constant, so the hook call order is stable across renders
  for (const system of EARN_SYSTEMS) openersById[system.id] = system.useActionOpener()
  return openersById
}
