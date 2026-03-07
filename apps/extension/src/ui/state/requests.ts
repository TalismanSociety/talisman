import type { KnownRequest, KnownRequestId, KnownRequestTypes, ValidRequests } from "@core"
import { bind } from "@react-rxjs/core"
import { api } from "@ui/api"
import { map, Observable } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const [useRequests, requests$] = bind(
  new Observable<ValidRequests[]>((subscriber) => {
    const unsubscribe = api.subscribeRequests((requests) => {
      subscriber.next(requests)
    })
    return () => unsubscribe()
  }).pipe(debugObservable("requests$"))
)

const [useRequestInner] = bind(<T extends KnownRequestTypes>(id: KnownRequestId<T>) =>
  requests$.pipe(
    map((requests) => requests.find((req) => req.id === id) as KnownRequest<T> | undefined)
  )
)

// just to fix typings
export const useRequest = <T extends KnownRequestTypes>(
  id: KnownRequestId<T>
): KnownRequest<T> | undefined => useRequestInner(id)
