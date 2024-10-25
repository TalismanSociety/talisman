import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { EvmAddress } from "@extension/core"
import { useTokens } from "@ui/state"
import { isErc20Token } from "@ui/util/isErc20Token"

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
          ?.filter(isErc20Token)
          .find(
            (t) =>
              t.evmNetwork?.id === evmNetworkId &&
              t.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
          )) ||
      null,
    [evmNetworkId, contractAddress, tokens],
  )
}
