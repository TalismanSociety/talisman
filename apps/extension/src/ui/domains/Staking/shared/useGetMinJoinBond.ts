import { ChainId } from "extension-core"

import { useGetBittensorMinJoinBond } from "./useGetBittensorMinJoinBond"
import { useNomPoolsMinJoinBond } from "./useNomPoolsMinJoinBond"

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
