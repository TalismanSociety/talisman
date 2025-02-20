import { bind } from "@react-rxjs/core"
import { settingsStore, SettingsStoreData } from "extension-core"
import { SetStateAction, useCallback } from "react"
import { firstValueFrom, map, Observable, shareReplay } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const settings$ = settingsStore.observable.pipe(debugObservable("settings$"), shareReplay(1))

export const [useSettingValue, getSettingValue$] = bind((key: keyof SettingsStoreData) =>
  settings$.pipe(map((state) => state[key])),
) as [
  <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => V,
  <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => Observable<V>,
]

export const useSetting = <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => {
  const state = useSettingValue(key)

  const setState = useCallback(
    async (value: SetStateAction<V>) => {
      if (typeof value === "function") {
        const setter = value as (prev: V) => V
        value = setter((await firstValueFrom(getSettingValue$(key))) as V)
      }
      await settingsStore.set({ [key]: value })
    },
    [key],
  )

  return [state, setState] as const
}

// shortcut, heavily used
export const [useSelectedCurrency, selectedCurrency$] = bind(getSettingValue$("selectedCurrency"))
