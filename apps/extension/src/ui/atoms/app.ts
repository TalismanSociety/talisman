import { AppStoreData, appStore } from "@core/domains/app/store.app"
import { SetStateAction, atom } from "jotai"
import { atomFamily } from "jotai/utils"

import { atomWithSubscription } from "./utils/atomWithSubscription"
import { KeyValueAtomFamily } from "./utils/types"

export const appStateAtom = atomWithSubscription<AppStoreData>((callback) => {
  const { unsubscribe } = appStore.observable.subscribe(callback)
  return unsubscribe
}, "appStateAtom")

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
