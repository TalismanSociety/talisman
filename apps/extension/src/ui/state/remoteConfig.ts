import { bind } from "@react-rxjs/core"
import { FeatureFlag, remoteConfigStore } from "extension-core"
import { distinctUntilChanged, map } from "rxjs"

export const [useRemoteConfig, remoteConfig$] = bind(remoteConfigStore.observable)

export const [useFeatureFlag, getFeatureFlag$] = bind((feature: FeatureFlag) =>
  remoteConfig$.pipe(
    map((remoteConfig) => !!remoteConfig.featureFlags[feature]),
    distinctUntilChanged()
  )
)
