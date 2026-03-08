import type { TokenId } from "@talismn/chaindata-provider"

import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type SwapInit = {
  fromTokenId?: TokenId
  toTokenId?: TokenId
  fromAddress?: string
}

export const [useSwapTokensModal] = createGlobalOpenClose<SwapInit>()
