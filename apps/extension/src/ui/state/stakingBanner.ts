import { bind } from "@react-rxjs/core"
import { stakingBannerStore } from "extension-core"

export const [useStakingBannerStore, stakingBannerStore$] = bind(stakingBannerStore.observable)
