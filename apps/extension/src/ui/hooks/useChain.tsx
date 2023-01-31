import type { ChainId } from "@core/domains/chains/types"
import { useMemo } from "react"

import useChains from "./useChains"

const useChain = (id?: ChainId) => {
  const { chainsMap } = useChains(true)

  return id ? chainsMap[id] : undefined
}

export default useChain
