import { EvmNetworkId, isTokenEvmErc20 } from "@talismn/chaindata-provider"
import { EvmAddress } from "extension-core"
import { useMemo } from "react"

import { useTokens } from "@ui/state"

// TODO leverage a selectorFamily (waiting for jotai migration)
export const useErc20Token = (
  evmNetworkId: EvmNetworkId | null | undefined,
  contractAddress: EvmAddress | null | undefined,
) => {
  const tokens = useTokens()

  return useMemo(
    () =>
      (evmNetworkId &&
        contractAddress &&
        tokens
          ?.filter(isTokenEvmErc20)
          .find(
            (t) =>
              t.networkId === evmNetworkId &&
              t.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
          )) ||
      null,
    [evmNetworkId, contractAddress, tokens],
  )
}
