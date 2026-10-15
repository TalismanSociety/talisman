import type { StakingEntry } from "@common/analytics/staking"
import type { Address } from "@core/types/base"
import type { TokenId } from "@talismn/chaindata-provider"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type BondModalArgs = {
  entry: StakingEntry
  address: Address
  tokenId: TokenId
  poolId: number | string
}

export const [useBondModal] = createGlobalOpenClose<BondModalArgs>()
