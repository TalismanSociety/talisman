import { appStore } from "@core/domains/app"
import { AppStoreData, DEFAULT_APP_STATE } from "@core/domains/app/store.app"
import { provideContext } from "@talisman/util/provideContext"
import { useEffect, useState } from "react"

// the hook is read only for now, relying on backend calls for all state updates
// however if needed, we can use same logic as SettingsProvider to make it read/write
const useAppStateProvider = () => {
  const [appState, setAppState] = useState<AppStoreData>(DEFAULT_APP_STATE)

  useEffect(() => {
    const sub = appStore.observable.subscribe(setAppState)
    return () => sub.unsubscribe()
  }, [])

  return appState
}

export const [AppStateProvider, useAppState] = provideContext(useAppStateProvider)
