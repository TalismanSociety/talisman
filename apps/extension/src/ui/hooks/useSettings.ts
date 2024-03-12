import { SettingsStoreData, settingsStore } from "@extension/core"
import { settingsAtom } from "@ui/atoms"
import { SetStateAction, useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"

export const useSetting = <K extends keyof SettingsStoreData, V = SettingsStoreData[K]>(key: K) => {
  // don't use settingsAtomFamily here, because it would suspense the first time each key is called
  const settings = useAtomValue(settingsAtom)

  const value = useMemo(() => settings[key] as V, [key, settings])

  const set = useCallback(
    async (valueOrSetter: SetStateAction<V>) => {
      if (typeof valueOrSetter === "function") {
        const setter = valueOrSetter as (prev: V) => V
        await settingsStore.set({ [key]: setter(value) })
      } else await settingsStore.set({ [key]: valueOrSetter as V })
    },
    [key, value]
  )

  return [value, set] as const
}
