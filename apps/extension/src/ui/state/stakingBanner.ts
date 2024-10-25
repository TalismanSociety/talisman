import { bind } from "@react-rxjs/core"
import { stakingBannerStore } from "extension-core"

import { debugObservable } from "./util/debugObservable"

export const [useStakingBannerStore, stakingBannerStore$] = bind(
  stakingBannerStore.observable.pipe(debugObservable("stakingBannerStore$")),
)
