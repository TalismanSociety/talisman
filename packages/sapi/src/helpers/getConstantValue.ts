import { getConstantValueFromMetadata } from "@talismn/scale"

import type { Chain } from "./types"

export const getConstantValue = <T>(chain: Chain, pallet: string, constant: string) => {
  return getConstantValueFromMetadata<T>(
    {
      builder: chain.builder,
      unifiedMetadata: chain.metadata,
    },
    pallet,
    constant
  )
}
