import { ChainId } from "extension-core"

import { useNomPoolsMinJoinBond } from "./useNomPoolsMinJoinBond"

const MIN_SUBTENSOR_STAKE = { data: 100000000n }

export const useGetMinJoinBond = (chainId: ChainId | null | undefined) => {
  const minNomPoolsJoinBond = useNomPoolsMinJoinBond({
    chainId,
    isEnabled: chainId !== "bittensor",
  })

  switch (chainId) {
    case "bittensor":
      return MIN_SUBTENSOR_STAKE
    default:
      return minNomPoolsJoinBond
  }
}
