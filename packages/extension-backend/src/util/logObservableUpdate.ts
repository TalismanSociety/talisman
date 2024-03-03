import { MonoTypeOperatorFunction, tap } from "rxjs"

import { log } from "../log"

// @dev turn this on temporarily when needed
const ACTIVE = false

export const logObservableUpdate = <T>(debugLabel?: string): MonoTypeOperatorFunction<T> =>
  tap((value) => {
    if (ACTIVE && debugLabel) log.debug(`[${debugLabel}] UPDATING`, { value })
  })
