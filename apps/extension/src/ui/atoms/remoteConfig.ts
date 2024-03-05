import { FeatureFlag, RemoteConfigStoreData } from "extension-core"
import { remoteConfigStore } from "extension-core"
import { atom } from "jotai"
import { atomFamily } from "jotai/utils"

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
