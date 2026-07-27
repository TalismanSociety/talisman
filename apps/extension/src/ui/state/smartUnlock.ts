import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const isSmartUnlockEnrolled$ = new Observable<boolean>((subscriber) => {
  const unsubscribe = api.smartUnlockIsEnrolledSubscribe(({ enrolled }) =>
    subscriber.next(enrolled)
  )
  return () => unsubscribe()
}).pipe(debugObservable("isSmartUnlockEnrolled$"), shareReplay(1))

// bound with a default value, the login screen must not suspend on it
export const [useIsSmartUnlockEnrolled] = bind(isSmartUnlockEnrolled$, false)
