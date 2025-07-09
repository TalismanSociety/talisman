/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

import { TEST } from "./constants"

/** A function which does nothing. */
const noop = (..._data: any[]) => {}

/**
 * A simple logging utility that provides methods for logging errors, warnings, logs, and debug messages.
 * It also includes a timer utility for measuring the duration of operations.
 */
export const log = {
  error: !TEST && typeof console.error === "function" ? console.error.bind(console) : noop,
  warn: !TEST && typeof console.warn === "function" ? console.warn.bind(console) : noop,
  log: !TEST && typeof console.log === "function" ? console.log.bind(console) : noop,
  debug: !TEST && typeof console.debug === "function" ? console.debug.bind(console) : noop,

  /**
   * A convenient way to create a debug timer.
   *
   * @example
   * const done = log.timer("How long does it take?")
   * await doSomething()
   * done()
   **/
  timer: (label: string) => {
    if (TEST) return () => {}

    const start = performance.now()

    return () => {
      console.debug(`${label} - ${(performance.now() - start).toFixed(2)}ms`)
    }
  },
}
