import { getConstantValueFromMetadata } from "@talismn/scale"

import { Chain } from "./types"

export const getConstantValue = <T>(chain: Chain, pallet: string, constant: string) => {
  return getConstantValueFromMetadata<T>(
    {
      builder: chain.builder,
      unifiedMetadata: chain.metadata,
    },
    pallet,
    constant,
  )
}
