/* eslint-disable no-console */
import { DEBUG } from "@core/constants"

/**
 * Provides a convenience wrapper around the console methods to only log when DEBUG mode enabled
 **/
export const log = {
  error: (message: any, ...args: any[]) => DEBUG && console.error(message, ...args),
  warn: (message: any, ...args: any[]) => DEBUG && console.warn(message, ...args),
  log: (message: any, ...args: any[]) => DEBUG && console.log(message, ...args),
  debug: (message: any, ...args: any[]) => DEBUG && console.debug(message, ...args),
}
