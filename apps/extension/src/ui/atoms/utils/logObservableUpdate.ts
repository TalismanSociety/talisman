import { log } from "@extension/shared"
import { MonoTypeOperatorFunction, tap } from "rxjs"

// @dev turn this on temporarily when needed
const ACTIVE = false

export const logObservableUpdate = <T>(debugLabel?: string): MonoTypeOperatorFunction<T> =>
  tap((value) => {
    if (ACTIVE && debugLabel) log.debug(`[${debugLabel}] UPDATING`, { value })
  })
