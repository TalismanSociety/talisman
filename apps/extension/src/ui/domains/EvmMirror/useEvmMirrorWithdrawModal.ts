import type { Address } from "@core/types/base"
import type { TokenId } from "@talismn/chaindata-provider"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type EvmMirrorWithdrawModalArgs = {
  address: Address
  tokenId: TokenId
}

export const [useEvmMirrorWithdrawModal] = createGlobalOpenClose<EvmMirrorWithdrawModalArgs>()
