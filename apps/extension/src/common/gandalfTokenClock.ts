/** Minimum remaining lifetime (ms) below which a Gandalf token is not handed out. */
export const GANDALF_TOKEN_EXPIRY_BUFFER_MS = 60_000

export type ClockAnchor = { wall: number; mono: number }

export const anchorClocks = (): ClockAnchor => ({ wall: Date.now(), mono: performance.now() })

/**
 * Time since the anchor, over-counting on purpose: a backward wall-clock jump is caught by the
 * monotonic clock, a monotonic pause during device sleep is caught by the wall clock.
 */
export const elapsedSince = ({ wall, mono }: ClockAnchor): number =>
  Math.max(Date.now() - wall, performance.now() - mono)
