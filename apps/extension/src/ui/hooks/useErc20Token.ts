import { EvmAddress } from "@extension/core"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { isErc20Token } from "@ui/util/isErc20Token"
import { useMemo } from "react"

import useTokens from "./useTokens"

// TODO leverage a selectorFamily (waiting for jotai migration)
export const useErc20Token = (
  evmNetworkId: EvmNetworkId | null | undefined,
  contractAddress: EvmAddress | null | undefined
) => {
  const { tokens } = useTokens({ activeOnly: false, includeTestnets: true })

  return useMemo(
    () =>
      (evmNetworkId &&
        contractAddress &&
        tokens
          ?.filter(isErc20Token)
          .find(
            (t) =>
              t.type === "evm-erc20" &&
              t.evmNetwork?.id === evmNetworkId &&
              t.contractAddress.toLowerCase() === contractAddress.toLowerCase()
          )) ||
      null,
    [evmNetworkId, contractAddress, tokens]
  )
}
