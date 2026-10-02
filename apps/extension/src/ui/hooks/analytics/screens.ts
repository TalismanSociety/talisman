import { toDurationMs } from "@common/analytics/schema"
import type { JoinedPattern, PatternAwaits } from "@common/analytics/screenPattern"
import { pageContext } from "@ui/api/pageContext"
import { track } from "@ui/api/track"
import { IS_POPUP } from "@ui/util/constants"
import { useEffect, useRef } from "react"

import { onScreenReported } from "./flows"

/**
 * How long a pattern waits before it is the screen. A prefix splat waits for its descendant
 * `<Routes>`: React holds a suspended boundary's content back for at least 300 ms after its
 * fallback, and a lazy chunk or a data subscription can take longer. A catch-all waits for a
 * `<Navigate>` that replaces the location within a frame.
 */
export const SETTLE_MS: Record<PatternAwaits, number> = {
  nothing: 0,
  redirect: 300,
  descendant: 2_000,
}

/** A splat screen replaced sooner than this was a redirect hop, not a screen the user saw. */
const REDIRECT_MS = 100

export type ScreenRegistration = { depth: number; joined: JoinedPattern; at: number }
type LiveRegistration = ScreenRegistration & { refined?: boolean }
type VirtualRegistration = { name: VirtualScreen; at: number }

export type SettledScreen = { name: string; at: number }

/**
 * A mounted shell screen wins (the last one mounted). Otherwise the deepest `<Routes>`, the latest
 * on a tie, once it waited what its pattern awaits.
 */
export const settleScreen = ({
  virtual,
  routes,
  now,
}: {
  virtual: readonly VirtualRegistration[]
  routes: readonly ScreenRegistration[]
  now: number
}): SettledScreen | { wait: number } | null => {
  const shell = virtual.at(-1)
  if (shell) return { name: shell.name, at: shell.at }

  const deepest = routes.reduce<ScreenRegistration | null>(
    (best, route) => (!best || route.depth >= best.depth ? route : best),
    null
  )
  if (!deepest) return null

  const wait = SETTLE_MS[deepest.joined.awaits] - (now - deepest.at)
  return wait <= 0 ? { name: deepest.joined.pattern, at: deepest.at } : { wait }
}

const routes = new Map<number, LiveRegistration>()
const virtual: (VirtualRegistration & { id: number })[] = []
let nextId = 0
let reported: SettledScreen | null = null
let settleScheduled = false
let timer: ReturnType<typeof setTimeout> | null = null

/** Dwell runs from when each screen rendered, not from when it was reported. */
const report = (screen: SettledScreen) => {
  if (screen.name === reported?.name) return
  const previous = reported
  reported = screen
  pageContext.screen = screen.name
  onScreenReported(screen.name)

  track("$screen", {
    $screen_name: screen.name,
    ...(previous && {
      previous_screen_name: previous.name,
      previous_dwell_ms: toDurationMs(screen.at - previous.at),
    }),
  })
  if (!previous && IS_POPUP)
    track("popup_opened", { time_to_interactive_ms: toDurationMs(screen.at) })
}

const settle = () => {
  settleScheduled = false
  if (timer) clearTimeout(timer)
  timer = null

  const live = [...routes.values()]
  const settled = settleScreen({ virtual, routes: live, now: performance.now() })
  if (!settled) return
  if ("wait" in settled) {
    timer = setTimeout(settle, settled.wait)
    return
  }
  const winner = live.find((route) => route.at === settled.at)
  for (const route of live) if (winner && route.depth < winner.depth) route.refined = true
  report(settled)
}

/** After the commit's effects have all run, so the deepest registration is in. */
const scheduleSettle = () => {
  if (settleScheduled) return
  settleScheduled = true
  requestAnimationFrame(settle)
}

/**
 * A splat screen left before it settled: reported when it was the screen on show long enough to
 * be seen, dropped when it was a redirect hop or a deeper pattern refined it.
 */
const reportIfShown = (left: LiveRegistration) => {
  const shownFor = performance.now() - left.at
  if (left.refined || left.joined.awaits === "nothing" || shownFor < REDIRECT_MS) return
  const settled = settleScreen({
    virtual,
    routes: [...routes.values(), left],
    now: left.at + SETTLE_MS[left.joined.awaits],
  })
  if (settled && "name" in settled && settled.at === left.at) report(settled)
}

const useRegistrationId = () => {
  const id = useRef<number | null>(null)
  id.current ??= nextId++
  return id.current
}

/** Called by the tracked `<Routes>`. Null registers nothing: `screen={false}`. */
export const useScreenRegistration = (joined: JoinedPattern | null, depth: number) => {
  const id = useRegistrationId()
  const pattern = joined?.pattern
  const awaits = joined?.awaits

  useEffect(() => {
    if (pattern === undefined || awaits === undefined) return
    const registration: LiveRegistration = {
      depth,
      joined: { pattern, awaits },
      at: performance.now(),
    }
    routes.set(id, registration)
    scheduleSettle()
    return () => {
      routes.delete(id)
      reportIfShown(registration)
      scheduleSettle()
    }
  }, [id, pattern, awaits, depth])
}

/** Shell screens that replace the routed content without a location change. */
export type VirtualScreen = "/login" | "/locked" | "/migrating" | "/phishing-page-detected/:url"

export const useVirtualScreen = (name: VirtualScreen) => {
  const id = useRegistrationId()

  useEffect(() => {
    virtual.push({ id, name, at: performance.now() })
    scheduleSettle()
    return () => {
      virtual.splice(
        virtual.findIndex((entry) => entry.id === id),
        1
      )
      scheduleSettle()
    }
  }, [id, name])
}
