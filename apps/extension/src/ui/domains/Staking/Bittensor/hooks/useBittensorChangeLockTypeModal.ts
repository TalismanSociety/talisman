import type { DotNetworkId } from "@talismn/chaindata-provider"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type BittensorChangeLockTypeModalArgs = {
  /** the bittensor network the subnet lives on */
  networkId: DotNetworkId
  /** the subnet the conviction lock exists on */
  netuid: number
  /** optional coldkey to pre-select (must hold a conviction lock on the subnet) */
  address?: string
}

export const [useBittensorChangeLockTypeModal] =
  createGlobalOpenClose<BittensorChangeLockTypeModalArgs>()
