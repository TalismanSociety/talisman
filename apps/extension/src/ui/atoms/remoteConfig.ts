import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import { FeatureFlag, RemoteConfigStoreData } from "@core/domains/app/types"
import { log } from "@core/log"
import { atom, selectorFamily } from "recoil"

export const remoteConfigState = atom<RemoteConfigStoreData>({
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
