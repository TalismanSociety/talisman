import type { SettingsStoreData } from "@core/domains/app/store.settings"
import { settingsStore } from "@core/domains/app/store.settings"
import { bind } from "@react-rxjs/core"
import { reportSettingWrite } from "@ui/hooks/analytics/settings"
import { type SetStateAction, useCallback } from "react"
import { firstValueFrom, map, type Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const settings$ = settingsStore.observable.pipe(debugObservable("settings$"), shareReplay(1))

export const [useSettingValue, getSettingValue$] = bind((key: keyof SettingsStoreData) =>
  settings$.pipe(map((state) => state[key]))
) as [
  <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => V,
  <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => Observable<V>,
]

export const useSetting = <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => {
  const state = useSettingValue(key)

  const setState = useCallback(
    async (value: SetStateAction<V>) => {
      const previous = (await firstValueFrom(getSettingValue$(key))) as V
      const next = typeof value === "function" ? (value as (prev: V) => V)(previous) : value
      await settingsStore.set({ [key]: next })
      reportSettingWrite(key, previous as SettingsStoreData[K], next as SettingsStoreData[K])
    },
    [key]
  )

  return [state, setState] as const
}

// shortcut, heavily used
export const [useSelectedCurrency, selectedCurrency$] = bind(getSettingValue$("selectedCurrency"))
