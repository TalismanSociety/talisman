import { StakingBannerStatus, stakingBannerStore } from "@extension/core"

import { atomWithSubscription } from "./utils/atomWithSubscription"

/**
 * @name stakingBannerAtom
 * @description
 * This atom is used to store the staking banner status.
 * A true value means that the banner should be displayed for the chain and address
 */
export const stakingBannerAtom = atomWithSubscription<StakingBannerStatus>(
  (callback) => {
    const sub = stakingBannerStore.observable.subscribe(callback)
    return () => sub.unsubscribe()
  },
  { debugLabel: "stakingBannerAtom" }
)
