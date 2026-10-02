// `chrome.alarms` is the only timer that survives the service worker stopping.
const FLUSH_ALARM_NAME = "talisman-analytics-flush"

/** Chrome's minimum alarm delay. */
export const MIN_ALARM_DELAY_MS = 30_000

export interface FlushScheduler {
  /** One-shot at `when`. Same name, so a second call replaces the first. */
  schedule(when: number): Promise<void>
  clear(): Promise<void>
  scheduledAt(): Promise<number | undefined>
  /** Call synchronously during the worker's top-level evaluation, or Chrome does not wake the worker for the alarm. */
  onFire(listener: () => void): void
}

export const createChromeAlarmScheduler = (): FlushScheduler => ({
  schedule: (when) => chrome.alarms.create(FLUSH_ALARM_NAME, { when }),
  clear: async () => {
    await chrome.alarms.clear(FLUSH_ALARM_NAME)
  },
  scheduledAt: async () => (await chrome.alarms.get(FLUSH_ALARM_NAME))?.scheduledTime,
  onFire: (listener) =>
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === FLUSH_ALARM_NAME) listener()
    }),
})

export type WakePlan = { type: "keep" } | { type: "clear" } | { type: "schedule"; at: number }

/** The alarm decides when PostHog receives a request, so it never fires at a time set by the real clock alone. */
export const planWake = ({
  sendTimes,
  now,
  scheduledAt,
  drawDelay,
}: {
  sendTimes: readonly number[]
  now: number
  scheduledAt: number | undefined
  drawDelay: () => number
}): WakePlan => {
  if (!sendTimes.length) return scheduledAt === undefined ? { type: "keep" } : { type: "clear" }
  const pending = scheduledAt !== undefined && scheduledAt > now ? scheduledAt : undefined
  const shifted = sendTimes.find((sendAt) => sendAt >= now + MIN_ALARM_DELAY_MS)
  if (shifted !== undefined)
    return pending !== undefined && pending <= shifted
      ? { type: "keep" }
      : { type: "schedule", at: shifted }
  return pending !== undefined
    ? { type: "keep" }
    : { type: "schedule", at: now + MIN_ALARM_DELAY_MS + drawDelay() }
}
