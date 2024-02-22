import type { ChainId } from "@core/domains/chains/types"
import { useMemo } from "react"

import { useAllChainsMap } from "./useChains"

export const useChain = (id: ChainId | undefined | null) => {
  // DON'T DO THIS (suspenses once for each key)
  // return useAtomValue(chainByIdAtomFamily(id))

  const chainsMap = useAllChainsMap()
  return useMemo(() => (id && chainsMap[id]) || null, [chainsMap, id])
}

export default useChain
