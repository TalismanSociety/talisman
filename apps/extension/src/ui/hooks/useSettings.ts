import {
  DEFAULT_SETTINGS,
  SettingsStoreData,
  settingsStore,
} from "@core/domains/app/store.settings"
import { RecoilState, atom, selectorFamily, useRecoilState, useRecoilValue } from "recoil"

const settingsState = atom<SettingsStoreData>({
  key: "settingsState",
  default: DEFAULT_SETTINGS,
  effects: [
    ({ setSelf }) => {
      const key = "settingsState" + crypto.randomUUID()
      // TODO Cleanup
      // eslint-disable-next-line no-console
      console.time(key)
      const sub = settingsStore.observable.subscribe((v) => {
        // TODO Cleanup
        // eslint-disable-next-line no-console
        console.timeEnd(key)
        setSelf(v)
      })
      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

export const settingQuery = selectorFamily({
  key: "settingQuery",
  get:
    <K extends keyof SettingsStoreData, V extends SettingsStoreData[K]>(key: K) =>
    ({ get }): V => {
      const settings = get(settingsState)
      return settings[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    settingsStore.set({ [key]: value })
  },
  cachePolicy_UNSTABLE: {
    eviction: "most-recent",
  },
})

export const useSetting = <K extends keyof SettingsStoreData>(setting: K) => {
  return useRecoilState(settingQuery(setting) as RecoilState<SettingsStoreData[K]>)
}

export const useSettingRead = <K extends keyof SettingsStoreData>(setting: K) => {
  return useRecoilValue(settingQuery(setting) as RecoilState<SettingsStoreData[K]>)
}
