import type { SwapEntry } from "@common/analytics/funds"
import type { TokenId } from "@talismn/chaindata-provider"

import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"

export type SwapInit = {
  entry: SwapEntry
  fromTokenId?: TokenId
  toTokenId?: TokenId
  fromAddress?: string
}

export const [useSwapModal] = createGlobalOpenClose<SwapInit>()
