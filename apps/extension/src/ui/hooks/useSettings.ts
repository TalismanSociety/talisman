import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { RecoilState, atom, selectorFamily, useRecoilState } from "recoil"

const settingsState = atom<SettingsStoreData>({
  key: "settingsState",
  effects: [
    ({ setSelf }) => {
      const sub = settingsStore.observable.subscribe(setSelf)
      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

const settingQuery = selectorFamily({
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
})

export const useSetting = <K extends keyof SettingsStoreData>(setting: K) => {
  const selector = settingQuery(setting) as RecoilState<SettingsStoreData[K]>
  return useRecoilState(selector)
}
