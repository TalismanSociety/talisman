import type { ChainId } from "@core/domains/chains/types"
import { useMemo } from "react"

import useChains from "./useChains"

const useChain = (id?: ChainId) => {
  const chains = useChains()

  return useMemo(() => chains.find((chain) => chain.id === id), [chains, id])
}

export default useChain
