import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { log } from "@core/log"
import { GetRecoilValue, atom, selectorFamily } from "recoil"

const settingsState = atom<SettingsStoreData>({
  key: "settingsState",
  effects: [
    ({ setSelf }) => {
      log.debug("settingsState.init")
      const sub = settingsStore.observable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
  ],
})

export const settingQuery = selectorFamily({
  key: "settingQuery",
  get:
    <K extends keyof SettingsStoreData>(key: K) =>
    <V extends SettingsStoreData[K]>({ get }: { get: GetRecoilValue }): V => {
      const settings = get(settingsState)
      return settings[key] as V
    },
  set: (key) => (_, value) => {
    // update the rxjs observable so the derived recoil atom is updated
    settingsStore.set({ [key]: value })
  },
})
