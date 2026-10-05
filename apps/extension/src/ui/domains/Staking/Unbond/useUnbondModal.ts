import type { StakingEntry } from "@common/analytics/staking"
import type { Address } from "@core/types/base"
import type { TokenId } from "@talismn/chaindata-provider"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type UnbondModalArgs = {
  entry: StakingEntry
  address: Address
  tokenId: TokenId
  poolId: string | number | undefined
}

export const [useUnbondModal] = createGlobalOpenClose<UnbondModalArgs>()
