import { AppStoreData, appStore } from "@core/domains/app/store.app"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"

import { atomWithSubscription } from "./utils/atomWithSubscription"
import { KeyValueAtomFamily } from "./utils/types"

export const appStateAtom = atomWithSubscription<AppStoreData>((callback) => {
  const { unsubscribe } = appStore.observable.subscribe(callback)
  return unsubscribe
}, "appStateAtom")

export const appStateAtomFamily: KeyValueAtomFamily<AppStoreData> = atomFamily((key) =>
  atom(async (get) => {
    const state = await get(appStateAtom)
    return state[key]
  })
)
