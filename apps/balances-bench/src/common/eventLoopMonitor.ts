import { log } from "../log"

const SAMPLE_INTERVAL_MS = 5

/**
 * Samples event-loop lag to measure how long the JS thread is blocked by synchronous work.
 *
 * A timer is scheduled every SAMPLE_INTERVAL_MS; any extra delay beyond the interval means
 * the thread was busy and could not service the event loop — which on react-native is time
 * during which the app cannot respond to user interactions.
 *
 * Usage:
 *   const monitor = startEventLoopMonitor()
 *   ... run the workload ...
 *   monitor.stop() // logs max blocking slice + total blocked time
 */
export const startEventLoopMonitor = (label = "eventLoopMonitor") => {
  const startedAt = performance.now()
  let last = performance.now()
  let maxBlockedMs = 0
  let totalBlockedMs = 0
  let blockedSlices = 0

  const interval = setInterval(() => {
    const now = performance.now()
    const lag = now - last - SAMPLE_INTERVAL_MS
    last = now

    if (lag <= 0) return
    totalBlockedMs += lag
    blockedSlices++
    if (lag > maxBlockedMs) maxBlockedMs = lag
    // anything above ~2 frames would be visible jank on a device
    if (lag > 32) log.log(`[${label}] event loop blocked for ${lag.toFixed(1)}ms`)
  }, SAMPLE_INTERVAL_MS)

  const report = () => {
    const elapsedMs = performance.now() - startedAt
    return {
      elapsedMs: Math.round(elapsedMs),
      maxBlockedMs: Math.round(maxBlockedMs * 10) / 10,
      totalBlockedMs: Math.round(totalBlockedMs),
      blockedSlices,
      blockedPct: Math.round((totalBlockedMs / elapsedMs) * 1000) / 10,
    }
  }

  return {
    report,
    stop: () => {
      clearInterval(interval)
      const { elapsedMs, maxBlockedMs, totalBlockedMs, blockedSlices, blockedPct } = report()
      log.log(
        `[${label}] elapsed:${elapsedMs}ms maxBlockedSlice:${maxBlockedMs}ms totalBlocked:${totalBlockedMs}ms (${blockedPct}%) blockedSlices:${blockedSlices}`
      )
    },
  }
}
