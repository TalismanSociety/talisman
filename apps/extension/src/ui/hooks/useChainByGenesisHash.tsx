import { useMemo } from "react"

import { useChains } from "./useChains"

const useChainByGenesisHash = (genesisHash: string | null | undefined) => {
  const { chains } = useChains({ activeOnly: false, includeTestnets: true })

  return useMemo(
    () => (genesisHash ? chains.find((c) => c.genesisHash === genesisHash) : undefined),
    [chains, genesisHash]
  )
}

export default useChainByGenesisHash
