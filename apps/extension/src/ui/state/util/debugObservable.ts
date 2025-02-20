import { MonoTypeOperatorFunction, tap } from "rxjs"

import { log } from "@extension/shared"

// @dev turn this on temporarily when needed
// note that log.debug() outputs nothing on prod builds
const ACTIVE = true

export const debugObservable = <T>(
  label: string,
  outputData?: boolean,
): MonoTypeOperatorFunction<T> =>
  tap((data) => {
    if (!ACTIVE || !label) return

    const text = `[observable] ${label} emit`

    if (outputData) log.debug(text, { data })
    else log.debug(text)
  })
