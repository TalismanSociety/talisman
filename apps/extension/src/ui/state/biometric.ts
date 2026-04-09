import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const isBiometricEnrolled$ = new Observable<boolean>((subscriber) => {
  const unsubscribe = api.biometricIsEnrolledSubscribe(({ enrolled }) => {
    subscriber.next(enrolled)
  })
  return () => unsubscribe()
}).pipe(debugObservable("isBiometricEnrolled$"), shareReplay(1))

const [_useIsBiometricEnrolled] = bind(isBiometricEnrolled$)
export const useIsBiometricEnrolled = _useIsBiometricEnrolled
