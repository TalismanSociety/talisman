import { Address } from "@talismn/balances"
import { ChainId, TokenId } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"

type ShouldShowBanner = boolean
export type NomPoolStakingBannerStatus = Record<ChainId, Record<Address, ShouldShowBanner>>
export type EvmLSdStakingBannerStatus = Record<TokenId, Record<Address, ShouldShowBanner>>

export type StakingBannerStatus = {
  nomPool: NomPoolStakingBannerStatus
  evmLsd: EvmLSdStakingBannerStatus
}

export const stakingBannerStore = new StorageProvider<StakingBannerStatus>("stakingBanners")
