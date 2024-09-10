import { useMemo } from "react"

import { useAllChainsMapByGenesisHash } from "./useChains"

export const useChainByGenesisHash = (genesisHash: string | null | undefined) => {
  const chainsMap = useAllChainsMapByGenesisHash()
  return useMemo(() => (genesisHash && chainsMap[genesisHash]) || null, [chainsMap, genesisHash])
}
