import { AppStoreData, appStore } from "@core/domains/app/store.app"
import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { log } from "@core/log"
import { GetRecoilValue, atom, selectorFamily } from "recoil"
import { combineLatest } from "rxjs"

// load these two in parallel for faster startup
export const baseState = atom<{
  settings: SettingsStoreData
  appState: AppStoreData
}>({
  key: "baseState",
  effects: [
    ({ setSelf }) => {
      const stop = log.timer("localStorageState")
      combineLatest([settingsStore.observable, appStore.observable]).subscribe(
        ([settings, appState]) => {
          stop()
          setSelf({ settings, appState })
        }
      )
    },
  ],
})

export const settingQuery = selectorFamily({
  key: "settingQuery",
  get:
    <K extends keyof SettingsStoreData>(key: K) =>
    <V extends SettingsStoreData[K]>({ get }: { get: GetRecoilValue }): V => {
      const { settings } = get(baseState)
      return settings[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    settingsStore.set({ [key]: value })
  },
})

export const appStateQuery = selectorFamily({
  key: "appStateQuery",
  get:
    <K extends keyof AppStoreData, V extends AppStoreData[K]>(key: K) =>
    ({ get }): V => {
      const { appState } = get(baseState)
      return appState[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    appStore.set({ [key]: value })
  },
})
