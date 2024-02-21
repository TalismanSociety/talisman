import { AppStoreData, appStore } from "@core/domains/app/store.app"
import { appStateAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"
import { useCallback } from "react"

export const useAppState = <K extends keyof AppStoreData>(key: K) => {
  const value = useAtomValue(appStateAtomFamily(key)) as AppStoreData[K]

  const set = useCallback(
    (value: AppStoreData[K]) => {
      appStore.set({ [key]: value })
    },
    [key]
  )

  return [value, set] as const
}
