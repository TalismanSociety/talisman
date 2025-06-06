/* eslint-disable no-console, @typescript-eslint/no-explicit-any */

/** A function which does nothing. */
const noop = (..._data: any[]) => {}

/**
 **/
export const log = {
  error: typeof console.error === "function" ? console.error.bind(console) : noop,
  warn: typeof console.warn === "function" ? console.warn.bind(console) : noop,
  log: typeof console.log === "function" ? console.log.bind(console) : noop,
  debug: typeof console.debug === "function" ? console.debug.bind(console) : noop,

  /**
   * A convenient way to create a debug timer.
   *
   * @example
   * const done = log.timer("How long does it take?")
   * await doSomething()
   * done()
   **/
  timer: (label: string) => {
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
