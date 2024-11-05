import { ChainId } from "extension-core"

import { useGetBittensorMinJoinBond } from "../hooks/bittensor/useGetBittensorMinJoinBond"
import { useNomPoolsMinJoinBond } from "../hooks/nomPools/useNomPoolsMinJoinBond"

export const useGetMinJoinBond = (chainId: ChainId | null | undefined) => {
  const minNomPoolsJoinBond = useNomPoolsMinJoinBond({
    chainId,
    isEnabled: chainId !== "bittensor",
  })

  const minBittensorJoinBond = useGetBittensorMinJoinBond({ chainId })

  switch (chainId) {
    case "bittensor":
      return minBittensorJoinBond
    default:
      return minNomPoolsJoinBond
  }
}
