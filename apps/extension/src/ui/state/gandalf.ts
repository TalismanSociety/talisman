import { bind } from "@react-rxjs/core"
import type { Loadable } from "@talismn/util"
import { api } from "@ui/api"
import { Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const gandalfAccessTokenRaw$ = new Observable<Loadable<string>>((subscriber) => {
  const unsubscribe = api.gandalfAccessTokenSubscribe((data) => {
    subscriber.next(data)
  })

  return () => {
    unsubscribe()
  }
}).pipe(debugObservable("gandalfAccessTokenRaw$"), shareReplay({ bufferSize: 1, refCount: true }))

export const [useGandalfAccessToken, gandalfAccessToken$] = bind(gandalfAccessTokenRaw$, {
  status: "loading",
})
