import { StakingBannerStatus, stakingBannerStore } from "@core/domains/staking/store.StakingBanners"
import { atom } from "recoil"

/**
 * @name stakingBannerState
 * @description
 * This atom is used to store the staking banner status.
 * A true value means that the banner should be displayed for the chain and address
 */
export const stakingBannerState = atom<StakingBannerStatus>({
  key: "stakingBannerState",
  effects: [
    ({ setSelf }) => {
      const sub = stakingBannerStore.observable.subscribe(setSelf)

      return () => sub.unsubscribe()
    },
  ],
})
