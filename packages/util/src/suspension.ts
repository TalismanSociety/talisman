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

type ResumeListener = (suspendedMs: number) => void

const listeners = new Set<ResumeListener>()
let holds = 0
let ticker: ReturnType<typeof setInterval> | null = null
let lastRunAt = 0
let lastResumedAt = Number.NEGATIVE_INFINITY
/** when the host marked the runtime suspended (`setSuspended(true)`), or null */
let suspendedSince: number | null = null

const hold = () => {
  holds++
  if (ticker) return
  lastRunAt = Date.now()
  ticker = setInterval(checkSuspension, TICK_MS)
}

const release = () => {
  holds--
  if (holds > 0 || !ticker) return
  clearInterval(ticker)
  ticker = null
}

/**
 * Records that the JS runtime is running now. When it last ran longer than
 * `SUSPENSION_GAP_MS` ago, it was suspended in between: the resume listeners run before this
 * returns. Cheap enough to call at the start of every timer callback that measures time.
 */
export const checkSuspension = (): void => {
  const now = Date.now()
  const suspendedMs = ticker ? now - lastRunAt : 0
  lastRunAt = now
  // while the host holds the runtime suspended, the resume comes from `setSuspended(false)`
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
 * resume listeners run with the time since `setSuspended(true)`.
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
  lastRunAt = now
  resume(now, suspendedMs)
}

/** Whether the host has marked the runtime suspended (`setSuspended(true)`) */
export const isSuspended = (): boolean => suspendedSince !== null

/**
 * When the JS runtime last resumed from a suspension (`Date.now()` time), or -Infinity when
 * no suspension has been seen. Suspensions are only seen while something is watching: an
 * `onResume` listener or a pending `setAwakeTimeout`.
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
    if (suspendedSince !== null) {
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
