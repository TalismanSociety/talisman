import { bind } from "@react-rxjs/core"
import { Observable, shareReplay } from "rxjs"

import { api } from "@ui/api"

export const isLoggedIn$ = new Observable<boolean>((subscriber) => {
  const unsubscribe = api.authStatusSubscribe((v) => subscriber.next(v === "TRUE"))
  return () => unsubscribe()
}).pipe(shareReplay({ bufferSize: 1, refCount: true }))

export const [useIsLoggedIn] = bind(isLoggedIn$)
