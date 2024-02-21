import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { FeatureFlag, RemoteConfigStoreData } from "@core/domains/app/types"
import { log } from "@core/log"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"
import { atom as ratom, selectorFamily } from "recoil"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const remoteConfigAtom = atomWithSubscription<RemoteConfigStoreData>((callback) => {
  const { unsubscribe } = remoteConfigStore.observable.subscribe(callback)
  return unsubscribe
}, "remoteConfigAtom")

export const featureFlagAtomFamily = atomFamily((key: FeatureFlag) =>
  atom(async (get) => {
    const remoteConfig = await get(remoteConfigAtom)
    return remoteConfig.featureFlags[key]
  })
)

export const remoteConfigState = ratom<RemoteConfigStoreData>({
  key: "remoteConfigState",
  effects: [
    ({ setSelf }) => {
      log.debug("remoteConfigState.init")
      const sub = remoteConfigStore.observable.subscribe(setSelf)
      return () => sub.unsubscribe()
    },
  ],
})

export const featureFlagQuery = selectorFamily({
  key: "featureFlagQuery",
  get:
    (key: FeatureFlag) =>
    ({ get }) => {
      const { featureFlags } = get(remoteConfigState)
      return !!featureFlags[key]
    },
})
