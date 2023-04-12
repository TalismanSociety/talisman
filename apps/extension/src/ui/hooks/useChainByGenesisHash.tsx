import { useMemo } from "react"

import { useChains } from "./useChains"

const useChainByGenesisHash = (genesisHash: string | undefined) => {
  const { chains } = useChains(true)

  return useMemo(
    () => (genesisHash ? chains.find((c) => c.genesisHash === genesisHash) : undefined),
    [chains, genesisHash]
  )
}

export default useChainByGenesisHash
