import type { LoggedinType } from "@core/domains/app/types"
import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { tapLoggedIn } from "@ui/hooks/analytics/performance"
import { filter, map, Observable, shareReplay, take, tap } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const authStatus$ = new Observable<LoggedinType>((subscriber) => {
  const unsubscribe = api.authStatusSubscribe((status) => subscriber.next(status))
  return () => unsubscribe()
}).pipe(shareReplay(1))

export const isLoggedIn$ = authStatus$.pipe(
  map((status) => status === "TRUE"),
  debugObservable("isLoggedIn$"),
  tap(tapLoggedIn),
  shareReplay(1)
)

// a service worker that has just woken up reports UNKNOWN until it has looked for a session to
// restore, so only the first known status says whether the page opened locked
const openedLocked$ = authStatus$.pipe(
  filter((status) => status !== "UNKNOWN"),
  take(1),
  map((status) => status === "FALSE"),
  shareReplay(1)
)

/** Whether the wallet was locked when this page opened. null until the background knows. */
export const [useOpenedLocked] = bind<boolean | null>(openedLocked$, null)
