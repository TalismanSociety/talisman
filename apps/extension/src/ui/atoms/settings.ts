import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { log } from "@core/log"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"
import { GetRecoilValue, atom as ratom, selectorFamily } from "recoil"

import { atomWithSubscription } from "./utils/atomWithSubscription"
import { KeyValueAtomFamily } from "./utils/types"

export const settingsAtom = atomWithSubscription<SettingsStoreData>((callback) => {
  const { unsubscribe } = settingsStore.observable.subscribe(callback)
  return unsubscribe
}, "settingsAtom")

export const settingsAtomFamily: KeyValueAtomFamily<SettingsStoreData> = atomFamily((key) =>
  atom(async (get) => {
    const settings = await get(settingsAtom)
    return settings[key]
  })
)

const settingsState = ratom<SettingsStoreData>({
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
