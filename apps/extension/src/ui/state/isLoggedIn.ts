import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { tapLoggedIn } from "@ui/hooks/analytics/performance"
import { Observable, shareReplay, tap } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const isLoggedIn$ = new Observable<boolean>((subscriber) => {
  const unsubscribe = api.authStatusSubscribe((v) => {
    subscriber.next(v === "TRUE")
  })
  return () => unsubscribe()
}).pipe(debugObservable("isLoggedIn$"), tap(tapLoggedIn), shareReplay(1))

const [_useIsLoggedIn] = bind(isLoggedIn$)
