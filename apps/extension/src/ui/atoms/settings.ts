import { atom, SetStateAction } from "jotai"
import { atomFamily, atomWithObservable } from "jotai/utils"

import { settingsStore, SettingsStoreData } from "@extension/core"

import { KeyValueAtomFamily } from "./utils/types"

// export const settingsAtom = atomWithSubscription<SettingsStoreData>(
//   (callback) => {
//     const sub = settingsStore.observable.subscribe(callback)
//     return () => sub.unsubscribe()
//   },
//   { debugLabel: "settingsAtom" }
// )

export const settingsAtom = atomWithObservable(() => settingsStore.observable)

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
