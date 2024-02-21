import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { settingsAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useCallback } from "react"

export const useSetting = <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => {
  const value = useAtomValue(settingsAtomFamily(key)) as V

  const set = useCallback(
    (valueOrSetter: V | ((prev: V) => V)) => {
      if (typeof valueOrSetter === "function") {
        const setter = valueOrSetter as (prev: V) => V
        settingsStore.set({ [key]: setter(value) })
        return
      }
      settingsStore.set({ [key]: valueOrSetter as V })
    },
    [key, value]
  )

  return [value, set] as const
}
