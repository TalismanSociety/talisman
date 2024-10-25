import { bind } from "@react-rxjs/core"
import { FeatureFlag, remoteConfigStore } from "extension-core"
import { distinctUntilChanged, map } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const [useRemoteConfig, remoteConfig$] = bind(
  remoteConfigStore.observable.pipe(debugObservable("remoteConfig$")),
)

export const [useFeatureFlag, getFeatureFlag$] = bind((feature: FeatureFlag) =>
  remoteConfig$.pipe(
    map((remoteConfig) => !!remoteConfig.featureFlags[feature]),
    distinctUntilChanged(),
  ),
)
