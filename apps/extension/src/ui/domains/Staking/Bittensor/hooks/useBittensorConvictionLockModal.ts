import type { StakingEntry } from "@common/analytics/staking"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type BittensorConvictionLockModalArgs = {
  entry: StakingEntry
  /** the bittensor network the subnet lives on */
  networkId: DotNetworkId
  /** the subnet to lock stake on (always > 0, root has no conviction locks) */
  netuid: number
  /** optional account to pre-select (a coldkey with stake on the subnet) */
  address?: string
  /** optional hotkey to pre-select as the lock's conviction target */
  hotkey?: string
}

export const [useBittensorConvictionLockModal] =
  createGlobalOpenClose<BittensorConvictionLockModalArgs>()
