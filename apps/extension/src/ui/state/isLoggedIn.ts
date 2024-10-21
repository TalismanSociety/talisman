import { bind } from "@react-rxjs/core"
import { Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

import { debugObservable } from "./util/debugObservable"

export const isLoggedIn$ = new Observable<boolean>((subscriber) => {
  const unsubscribe = api.authStatusSubscribe((v) => {
    subscriber.next(v === "TRUE")
  })
  return () => unsubscribe()
}).pipe(debugObservable("isLoggedIn$"), shareReplay(1))

export const [useIsLoggedIn] = bind(isLoggedIn$)
