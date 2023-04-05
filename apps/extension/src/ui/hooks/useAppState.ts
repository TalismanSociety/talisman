import { appStore } from "@core/domains/app/store.app"
import { AppStoreData, DEFAULT_APP_STATE } from "@core/domains/app/store.app"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useEffect, useState } from "react"

// the hook is read only for now, relying on backend calls for all state updates
// however if needed, we can use same logic as SettingsProvider to make it read/write
const useAppStateProvider = () => {
  const [appState, setAppState] = useState<AppStoreData>(DEFAULT_APP_STATE)

  useEffect(() => {
    const sub = appStore.observable.subscribe(setAppState)
    return () => sub.unsubscribe()
  }, [])

  const snoozeBackupReminder = useCallback(() => {
    appStore.snoozeBackupReminder()
  }, [])

  return { ...appState, snoozeBackupReminder }
}

export const [AppStateProvider, useAppState] = provideContext(useAppStateProvider)
