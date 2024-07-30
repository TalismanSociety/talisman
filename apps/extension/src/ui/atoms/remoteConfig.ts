import { atom } from "jotai"
import { atomFamily } from "jotai/utils"

import { FeatureFlag, remoteConfigStore, RemoteConfigStoreData } from "@extension/core"

import { atomWithSubscription } from "./utils/atomWithSubscription"

export const remoteConfigAtom = atomWithSubscription<RemoteConfigStoreData>((callback) => {
  const sub = remoteConfigStore.observable.subscribe(callback)
  return () => sub.unsubscribe()
})

export const featureFlagAtomFamily = atomFamily((key: FeatureFlag) =>
  atom(async (get) => {
    const remoteConfig = await get(remoteConfigAtom)
    return remoteConfig.featureFlags[key]
  })
)
