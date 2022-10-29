import type { ChainId } from "@core/domains/chains/types"
import { useMemo } from "react"
import { useDbCache } from "./useDbData"
import { useDbDataSubscription } from "./useDbDataSubscription"

const useChain = (id?: ChainId) => {
  // keep db table up to date
  useDbDataSubscription("chains")

  const { allChains } = useDbCache()

  return useMemo(() => allChains.find((chain) => chain.id === id), [allChains, id])
}

export default useChain
