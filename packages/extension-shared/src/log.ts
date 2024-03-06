/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { DEBUG } from "./constants"

/**
 * Provides a convenience wrapper around the console methods to only log when DEBUG mode enabled
 **/
export const log = {
  error: (message: any, ...args: any[]) => DEBUG && console.error(message, ...args),
  warn: (message: any, ...args: any[]) => DEBUG && console.warn(message, ...args),
  log: (message: any, ...args: any[]) => DEBUG && console.log(message, ...args),
  debug: (message: any, ...args: any[]) => DEBUG && console.debug(message, ...args),

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
