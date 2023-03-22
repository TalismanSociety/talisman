import {
  DEFAULT_SETTINGS,
  SettingsStoreData,
  settingsStore,
} from "@core/domains/app/store.settings"
import { RecoilState, atom, selectorFamily, useRecoilState } from "recoil"

const settingsAtom = atom<SettingsStoreData>({
  key: "settingsAtom",
  default: DEFAULT_SETTINGS,
  effects: [
    ({ setSelf }) => {
      const sub = settingsStore.observable.subscribe(setSelf)
      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

const settingsFamily = selectorFamily({
  key: "settingsFamily",
  get:
    <K extends keyof SettingsStoreData, V extends SettingsStoreData[K]>(key: K) =>
    ({ get }): V => {
      const settings = get(settingsAtom)
      return settings[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    settingsStore.set({ [key]: value })
  },
})

export const useSetting = <K extends keyof SettingsStoreData>(setting: K) => {
  const selector = settingsFamily(setting) as RecoilState<SettingsStoreData[K]>
  return useRecoilState(selector)
}
