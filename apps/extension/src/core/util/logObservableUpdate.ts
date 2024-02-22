import { log } from "@core/log"
import { MonoTypeOperatorFunction, tap } from "rxjs"

export const logObservableUpdate = <T>(debugLabel?: string): MonoTypeOperatorFunction<T> =>
  tap((value) => {
    if (debugLabel) log.debug(`[${debugLabel}] UPDATING`, { value })
  })
