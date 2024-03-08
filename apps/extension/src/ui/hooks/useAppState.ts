import { AppStoreData, appStore } from "@extension/core"
import { appStateAtom } from "@ui/atoms"
import { SetStateAction, useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"

export const useAppState = <K extends keyof AppStoreData, V = AppStoreData[K]>(key: K) => {
  // don't use appStateAtomFamily here, because it would suspense the first time each key is called
  const appState = useAtomValue(appStateAtom)

  const value = useMemo(() => appState[key] as V, [key, appState])

  const set = useCallback(
    async (valueOrSetter: SetStateAction<V>) => {
      if (typeof valueOrSetter === "function") {
        const setter = valueOrSetter as (prev: V) => V
        await appStore.set({ [key]: setter(value) })
      } else await appStore.set({ [key]: valueOrSetter as V })
    },
    [key, value]
  )

  return [value, set] as const
}
