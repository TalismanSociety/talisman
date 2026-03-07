import { remoteConfigStore } from "@core/domains/app/store.remoteConfig"
import type { FeatureFlag } from "@core/domains/app/types"
import { bind } from "@react-rxjs/core"
import { distinctUntilChanged, map } from "rxjs"

import { debugObservable } from "./util/debugObservable"

export const [useRemoteConfig, remoteConfig$] = bind(
  remoteConfigStore.observable.pipe(debugObservable("remoteConfig$"))
)

const [useFeatureFlag, _getFeatureFlag$] = bind((feature: FeatureFlag) =>
  remoteConfig$.pipe(
    map((remoteConfig) => !!remoteConfig.featureFlags[feature]),
    distinctUntilChanged()
  )
)

export { useFeatureFlag }
