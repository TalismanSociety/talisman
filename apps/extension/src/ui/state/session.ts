import { bind } from "@react-rxjs/core"
import { sessionStore, SessionStoreData } from "extension-core"
import { SetStateAction, useCallback } from "react"
import { firstValueFrom, map, Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const session$ = sessionStore.observable.pipe(debugObservable("session$"), shareReplay(1))

export const [useSessionValue, getSessionValue$] = bind((key: keyof SessionStoreData) =>
  session$.pipe(map((state) => state[key])),
) as [
  <K extends keyof SessionStoreData, V = SessionStoreData[K]>(key: K) => V,
  <K extends keyof SessionStoreData, V = SessionStoreData[K]>(key: K) => Observable<V>,
]

export const useSessionState = <K extends keyof SessionStoreData, V = SessionStoreData[K]>(
  key: K,
) => {
  const state = useSessionValue(key)

  const setState = useCallback(
    async (value: SetStateAction<V>) => {
      if (typeof value === "function") {
        const setter = value as (prev: V) => V
        value = setter((await firstValueFrom(getSessionValue$(key))) as V)
      }
      await sessionStore.set({ [key]: value })
    },
    [key],
  )

  return [state, setState] as const
}
