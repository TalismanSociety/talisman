import { EthNetworkId } from "@talismn/chaindata-provider"
import { isAbortError } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { EvmAddress, getErc20TokenInfo, getUniswapV2TokenInfo } from "extension-core"
import { ContractFunctionExecutionError } from "viem"

import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"

export const useEvmTokenInfo = (evmNetworkId?: EthNetworkId, contractAddress?: EvmAddress) => {
  const publicClient = usePublicClient(evmNetworkId)

  const {
    isLoading,
    error,
    data: token,
  } = useQuery({
    queryKey: ["evmTokenInfo", evmNetworkId, contractAddress],
    queryFn: async () => {
      if (!evmNetworkId || !publicClient || !contractAddress) return undefined

      try {
        // try uniswapv2 contract
        return await getUniswapV2TokenInfo(publicClient, evmNetworkId, contractAddress)
      } catch (cause) {
        if (!(cause instanceof ContractFunctionExecutionError)) throw cause
        if (isAbortError(cause)) return undefined

        // try erc20 contract
        return await getErc20TokenInfo(publicClient, evmNetworkId, contractAddress)
      }
    },
    enabled: !!evmNetworkId && !!publicClient && !!contractAddress,
  })

  return { isLoading, error, token }
}
