import { atom, SetStateAction } from "jotai"
import { atomFamily } from "jotai/utils"

import { appStore, AppStoreData } from "@extension/core"

import { atomWithSubscription } from "./utils/atomWithSubscription"
import { KeyValueAtomFamily } from "./utils/types"

export const appStateAtom = atomWithSubscription<AppStoreData>(
  (callback) => {
    const sub = appStore.observable.subscribe(callback)
    return () => sub.unsubscribe()
  },
  { debugLabel: "appStateAtom" }
)

export const appStateAtomFamily: KeyValueAtomFamily<AppStoreData> = atomFamily((key) =>
  atom(
    async (get) => {
      const state = await get(appStateAtom)
      return state[key]
    },
    async (get, set, value: SetStateAction<unknown>) => {
      if (typeof value === "function") value = value((await get(appStateAtom))[key])
      await appStore.set({ [key]: value })
    }
  )
)
