import { settingsStore, SettingsStoreData } from "@core/domains/app"
import { useCallback, useEffect, useState } from "react"

export const useSettings = () => {
  const [settings, setSettings] = useState<SettingsStoreData>()

  useEffect(() => {
    const sub = settingsStore.observable.subscribe(setSettings)
    return () => sub.unsubscribe()
  }, [])

  const update = useCallback((updates: Partial<SettingsStoreData>): void => {
    settingsStore.set(updates)
  }, [])

  return { ...settings, update }
}
