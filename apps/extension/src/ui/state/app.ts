import { bind } from "@react-rxjs/core"
import { appStore, AppStoreData } from "extension-core"
import { SetStateAction, useCallback } from "react"
import { firstValueFrom, map, Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const appState$ = appStore.observable.pipe(debugObservable("appState$"), shareReplay(1))

export const [useAppStateValue, getAppStateValue$] = bind((key: keyof AppStoreData) =>
  appState$.pipe(map((state) => state[key])),
) as [
  <K extends keyof AppStoreData, V = AppStoreData[K]>(key: K) => V,
  <K extends keyof AppStoreData, V = AppStoreData[K]>(key: K) => Observable<V>,
]

export const useAppState = <K extends keyof AppStoreData, V = AppStoreData[K]>(key: K) => {
  const state = useAppStateValue(key)

  const setState = useCallback(
    async (value: SetStateAction<V>) => {
      if (typeof value === "function") {
        const setter = value as (prev: V) => V
        value = setter((await firstValueFrom(getAppStateValue$(key))) as V)
      }
      await appStore.set({ [key]: value })
    },
    [key],
  )

  return [state, setState] as const
}

export const [useIsOnboarded, isOnboarded$] = bind(
  getAppStateValue$("onboarded").pipe(map((onboarded) => onboarded === "TRUE")),
)
