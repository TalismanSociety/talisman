/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { DEBUG } from "./constants"

/** A function which does nothing. */
const noop = (..._data: any[]) => {}

/**
 * Provides a convenience wrapper around the console methods to only log when DEBUG mode is enabled.
 **/
export const log = {
  error: DEBUG && typeof console.error === "function" ? console.error.bind(console) : noop,
  warn: DEBUG && typeof console.warn === "function" ? console.warn.bind(console) : noop,
  log: DEBUG && typeof console.log === "function" ? console.log.bind(console) : noop,
  debug: DEBUG && typeof console.debug === "function" ? console.debug.bind(console) : noop,

  /**
   * A convenient way to create a debug timer.
   *
   * @example
   * const done = log.timer("How long does it take?")
   * await doSomething()
   * done()
   **/
  timer: (label: string) => {
    if (!DEBUG) return () => {}

    const timeKey = `${label} (${crypto.randomUUID()})`
    console.time(timeKey)

    let done = false

    return () => {
      if (done) return

      console.timeEnd(timeKey)
      done = true
    }
  },
}
