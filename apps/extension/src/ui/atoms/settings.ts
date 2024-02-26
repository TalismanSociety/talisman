import { SettingsStoreData, settingsStore } from "@core/domains/app/store.settings"
import { SetStateAction, atom } from "jotai"
import { atomFamily } from "jotai/utils"

import { atomWithSubscription } from "./utils/atomWithSubscription"
import { KeyValueAtomFamily } from "./utils/types"

export const settingsAtom = atomWithSubscription<SettingsStoreData>((callback) => {
  const { unsubscribe } = settingsStore.observable.subscribe(callback)
  return unsubscribe
}, "settingsAtom")

export const settingsAtomFamily: KeyValueAtomFamily<SettingsStoreData> = atomFamily((key) =>
  atom(
    async (get) => {
      const settings = await get(settingsAtom)
      return settings[key]
    },
    async (get, set, value: SetStateAction<unknown>) => {
      if (typeof value === "function") value = value((await get(settingsAtom))[key])
      await settingsStore.set({ [key]: value })
    }
  )
)
