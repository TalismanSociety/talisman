/**
 * Detects when the JS runtime has been suspended, and provides timeouts that count only the
 * time it was running.
 *
 * A mobile OS freezes an app that goes to the background, its webviews included, and a
 * browser can freeze a tab or put a laptop to sleep. No timer fires while the runtime is
 * frozen, and on resume every timer that came due in the meantime fires at once, before the
 * socket messages that arrived while it was frozen. A 30s request timeout armed shortly
 * before a 90s suspension therefore fails its request the moment the runtime resumes,
 * although the answer may already be waiting.
 *
 * A one-second ticker runs while anything is watching. A gap between two ticks longer than
 * `SUSPENSION_GAP_MS` is taken to be a suspension. Timer callbacks call `checkSuspension()`
 * first, because on resume a due timer can run before the ticker does.
 *
 * A page that is hidden can't tell a freeze from timer throttling: browsers run the timers of
 * a hidden tab once a second, and Chrome once a minute after five minutes. Both leave gaps
 * between ticks while socket messages keep arriving. In a hidden page, the first gap starts a
 * suspension that lasts until the page is shown again, or until its ticks run on time again
 * (a frozen page that resumes while hidden, or an extension's background page, which is never
 * shown). Taking each gap for a resume would restart every timeout once a minute, so that
 * none ever fires.
 *
 * A runtime can also be cut off while it keeps running: a webview whose network traffic goes
 * through its app's native code stays alive while the app is frozen in the background. Its
 * host marks that time with `setSuspended()`.
 */

const TICK_MS = 1_000

/**
 * A gap between ticks longer than this is a suspension. Well above the longest stall the JS
 * thread is expected to have while it runs, so that a busy thread is not taken for a frozen
 * one.
 */
const SUSPENSION_GAP_MS = 5_000

/**
 * A tick that comes `TICK_MS / 2` to this long after the one before is on time. Browsers
 * align a hidden page's timers to whole seconds, so its ticks can be up to two seconds apart.
 */
const ON_TIME_TICK_GAP_MS = 3_000

/** On-time ticks in a row that end a hidden page's suspension */
const ON_TIME_TICKS_TO_RESUME = 5

type ResumeListener = (suspendedMs: number) => void

const listeners = new Set<ResumeListener>()
let holds = 0
let ticker: ReturnType<typeof setInterval> | null = null
let lastRunAt = 0
/** when the ticker last ran */
let lastTickAt = 0
/** on-time ticks in a row since a hidden page's suspension started */
let onTimeTicks = 0
let lastResumedAt = Number.NEGATIVE_INFINITY
/** when the host marked the runtime suspended (`setSuspended(true)`), or null */
let suspendedSince: number | null = null
/** whether the page (when there is one) is hidden */
let pageHidden = false
/** the longest gap between ticks since the page was hidden */
let hiddenGapMs = 0
/** a suspension that has ended for the host or the page while the other still holds it */
let pending: { ms: number; byHost: boolean } | null = null
let watchingPage = false

/** The part of `document` used here: runtimes without a DOM have no `document` */
type PageDocument = {
  visibilityState: string
  addEventListener: (type: "visibilitychange", listener: () => void) => void
}

const getPage = () => (globalThis as { document?: PageDocument }).document

const isHeld = () => suspendedSince !== null || (pageHidden && hiddenGapMs > SUSPENSION_GAP_MS)

/** Ends the host's or the page's part of a suspension, and resumes once neither holds it */
const endHold = (now: number, ms: number, byHost: boolean) => {
  pending = {
    ms: Math.max(pending?.ms ?? 0, ms),
    byHost: (pending?.byHost ?? false) || byHost,
  }
  if (isHeld()) return

  const ended = pending
  pending = null
  lastRunAt = now
  if (ended.byHost || ended.ms > SUSPENSION_GAP_MS) resume(now, ended.ms)
}

const handleVisibilityChange = () => {
  const hidden = getPage()?.visibilityState === "hidden"
  if (hidden === pageHidden) return

  if (hidden) {
    // a gap from before the page was hidden is a suspension of its own
    checkSuspension()
    pageHidden = true
    hiddenGapMs = 0
    onTimeTicks = 0
    return
  }

  const now = Date.now()
  const ms = Math.max(hiddenGapMs, ticker ? now - lastRunAt : 0)
  pageHidden = false
  endPageHold(now, ms)
}

const endPageHold = (now: number, ms: number) => {
  hiddenGapMs = 0
  onTimeTicks = 0
  endHold(now, ms, false)
}

/**
 * Ends a hidden page's suspension once its ticks have run on time for a while: its timers run
 * at their normal pace again. A tick that runs right after another (the timers that came due
 * during a freeze, run together) counts neither way.
 */
const tick = () => {
  const now = Date.now()
  const sinceLastTick = now - lastTickAt
  lastTickAt = now
  checkSuspension()
  if (!pageHidden || hiddenGapMs <= SUSPENSION_GAP_MS) return

  if (sinceLastTick > ON_TIME_TICK_GAP_MS) onTimeTicks = 0
  else if (sinceLastTick >= TICK_MS / 2) onTimeTicks++
  if (onTimeTicks >= ON_TIME_TICKS_TO_RESUME) endPageHold(now, hiddenGapMs)
}

const watchPage = () => {
  const page = getPage()
  if (watchingPage || !page) return
  watchingPage = true
  pageHidden = page.visibilityState === "hidden"
  page.addEventListener("visibilitychange", handleVisibilityChange)
}

const hold = () => {
  holds++
  if (ticker) return
  watchPage()
  lastRunAt = Date.now()
  lastTickAt = lastRunAt
  ticker = setInterval(tick, TICK_MS)
}

const release = () => {
  holds--
  if (holds > 0 || !ticker) return
  clearInterval(ticker)
  ticker = null
}

/**
 * Records that the JS runtime is running now. When it last ran longer than
 * `SUSPENSION_GAP_MS` ago, it was suspended in between, and the resume listeners run before
 * this returns. When the host or a hidden page holds the suspension, they run once it ends.
 * Cheap enough to call at the start of every timer callback that measures time.
 */
export const checkSuspension = (): void => {
  const now = Date.now()
  const suspendedMs = ticker ? now - lastRunAt : 0
  lastRunAt = now
  // a hidden page resumes when it is shown, and a runtime the host holds suspended on
  // `setSuspended(false)`
  if (pageHidden) {
    hiddenGapMs = Math.max(hiddenGapMs, suspendedMs)
    return
  }
  if (suspendedSince !== null || suspendedMs <= SUSPENSION_GAP_MS) return
  resume(now, suspendedMs)
}

const resume = (now: number, suspendedMs: number) => {
  lastResumedAt = now
  for (const listener of [...listeners]) {
    try {
      listener(suspendedMs)
    } catch (error) {
      // one failing listener must not keep the others from running
      queueMicrotask(() => {
        throw error
      })
    }
  }
}

/**
 * Marks the JS runtime suspended (`true`) or running again (`false`), for a host that knows
 * the runtime is cut off although it keeps running. While suspended, `setAwakeTimeout`
 * timeouts don't fire. `setSuspended(false)` is a resume: the timeouts start over, and the
 * resume listeners run with the time since `setSuspended(true)`. When the page is also held
 * suspended (hidden, with a gap between ticks), the resume waits until it is shown.
 */
export const setSuspended = (suspended: boolean): void => {
  if (suspended) {
    suspendedSince ??= Date.now()
    return
  }
  if (suspendedSince === null) return

  const now = Date.now()
  const suspendedMs = now - suspendedSince
  suspendedSince = null
  endHold(now, suspendedMs, true)
}

/**
 * Whether the runtime is held suspended until a later resume: marked by the host
 * (`setSuspended(true)`), or a hidden page whose timers have stopped or been throttled
 */
export const isSuspended = (): boolean => {
  checkSuspension()
  return isHeld()
}

/**
 * When the JS runtime last resumed from a suspension (`Date.now()` time), or -Infinity when
 * no suspension has been seen. A freeze is only seen while something is watching (an
 * `onResume` listener or a pending `setAwakeTimeout`); the end of a suspension the host
 * marked (`setSuspended(false)`) is a resume in any case.
 */
export const getLastResumedAt = (): number => {
  checkSuspension()
  return lastResumedAt
}

/**
 * Calls `listener` each time the JS runtime resumes from a suspension, with how long it was
 * suspended for. Returns the function that removes it.
 */
export const onResume = (listener: ResumeListener): (() => void) => {
  listeners.add(listener)
  hold()
  let removed = false
  return () => {
    if (removed) return
    removed = true
    listeners.delete(listener)
    release()
  }
}

/**
 * Like `setTimeout`, but time the JS runtime spends suspended does not count. When the runtime
 * resumes from a suspension before the timeout is up, the timeout starts over from the resume,
 * so the work it guards gets its full time again. Returns the function that cancels it.
 */
export const setAwakeTimeout = (callback: () => void, ms: number): (() => void) => {
  hold()
  const startedAt = Date.now()
  let token: ReturnType<typeof setTimeout> | null = null
  let done = false

  const finish = () => {
    if (done) return
    done = true
    if (token) clearTimeout(token)
    token = null
    release()
  }

  const fire = () => {
    checkSuspension()
    if (isHeld()) {
      token = setTimeout(fire, ms)
      return
    }
    const countedFrom = Math.max(startedAt, lastResumedAt)
    const remaining = ms - (Date.now() - countedFrom)
    if (remaining > 0) {
      token = setTimeout(fire, remaining)
      return
    }
    finish()
    callback()
  }

  token = setTimeout(fire, ms)
  return finish
}
