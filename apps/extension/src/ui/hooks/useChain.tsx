import type { ChainId } from "@core/domains/chains/types"
import { useMemo } from "react"
import { useDbCache } from "./useDbCache"
import { useDbCacheSubscription } from "./useDbCacheSubscription"

const useChain = (id?: ChainId) => {
  // keep db table up to date
  useDbCacheSubscription("chains")

  const { allChains } = useDbCache()

  return useMemo(() => allChains.find((chain) => chain.id === id), [allChains, id])
}

export default useChain
