import { SettingsStoreData, settingsStore } from "@core/domains/app"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useEffect, useState } from "react"

const useSettingsProvider = () => {
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

// use with a provider in index.ts so settings don't have to be reloaded on each page
// for example this prevents flickering on hidden balances
export const [SettingsProvider, useSettings] = provideContext(useSettingsProvider)
