import type { Address } from "@core/types/base"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type BittensorClaimModalInput = {
  networkId: DotNetworkId
  /** explicit claim target: when address+hotkey are set the position picker is skipped */
  address?: Address
  /** validator whose basket entitlement to claim */
  hotkey?: string
  /** accounts whose positions the picker offers (defaults to all owned) */
  addresses?: Address[]
}

export const [useBittensorClaimModal] = createGlobalOpenClose<BittensorClaimModalInput>()
