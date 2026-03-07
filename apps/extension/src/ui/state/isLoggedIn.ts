import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const isLoggedIn$ = new Observable<boolean>((subscriber) => {
  const unsubscribe = api.authStatusSubscribe((v) => {
    subscriber.next(v === "TRUE")
  })
  return () => unsubscribe()
}).pipe(debugObservable("isLoggedIn$"), shareReplay(1))

const [_useIsLoggedIn] = bind(isLoggedIn$)
