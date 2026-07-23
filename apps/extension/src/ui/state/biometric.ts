import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const isBiometricEnrolled$ = new Observable<boolean>((subscriber) => {
  const unsubscribe = api.biometricIsEnrolledSubscribe(({ enrolled }) => subscriber.next(enrolled))
  return () => unsubscribe()
}).pipe(debugObservable("isBiometricEnrolled$"), shareReplay(1))

// bound with a default value, the login screen must not suspend on it
export const [useIsBiometricEnrolled] = bind(isBiometricEnrolled$, false)
