/* eslint-disable no-console */
import { DEBUG } from "@core/constants"

/**
 * Provides a convenience wrapper around the console methods to only log when DEBUG mode enabled
 **/
export const log = {
  error: (...args: any[]) => DEBUG && console.error(...args),
  log: (...args: any[]) => DEBUG && console.log(...args),
}
