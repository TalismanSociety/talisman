import type { AppStoreData } from "@core/domains/app/store.app"
import { appStore } from "@core/domains/app/store.app"
import { bind } from "@react-rxjs/core"
import { reportAppFlagWrite } from "@ui/hooks/analytics/settings"
import { type SetStateAction, useCallback } from "react"
import { firstValueFrom, map, type Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const appState$ = appStore.observable.pipe(debugObservable("appState$"), shareReplay(1))

const [useAppStateValue, getAppStateValue$] = bind((key: keyof AppStoreData) =>
  appState$.pipe(map((state) => state[key]))
) as [
  <K extends keyof AppStoreData, V = AppStoreData[K]>(key: K) => V,
  <K extends keyof AppStoreData, V = AppStoreData[K]>(key: K) => Observable<V>,
]

export const useAppState = <K extends keyof AppStoreData, V = AppStoreData[K]>(key: K) => {
  const state = useAppStateValue(key)

  const setState = useCallback(
    async (value: SetStateAction<V>) => {
      const previous = (await firstValueFrom(getAppStateValue$(key))) as V
      const next = typeof value === "function" ? (value as (prev: V) => V)(previous) : value
      await appStore.set({ [key]: next })
      reportAppFlagWrite(key, previous as AppStoreData[K], next as AppStoreData[K])
    },
    [key]
  )

  return [state, setState] as const
}

export const [useIsOnboarded, isOnboarded$] = bind(
  getAppStateValue$("onboarded").pipe(map((onboarded) => onboarded === "TRUE"))
)

const [_useCurrentMigration, currentMigration$] = bind(
  getAppStateValue$("currentMigration").pipe(map((migration) => migration ?? null))
)

export { currentMigration$ }
