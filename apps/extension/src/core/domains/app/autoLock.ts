export const DEFAULT_AUTO_LOCK_MINUTES = 15

/**
 * A stored duration that isn't a usable number (`NaN`, `null`, a leftover from an old
 * settings shape) must not be read as "never lock" — callers fall back to the default.
 */
export const isUsableAutoLockDuration = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
