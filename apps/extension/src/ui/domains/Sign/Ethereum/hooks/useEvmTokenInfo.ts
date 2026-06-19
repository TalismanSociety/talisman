import type { EvmAddress } from "@core/domains/ethereum/types"
import { getErc20TokenInfo } from "@core/util/getErc20TokenInfo"
import { getUniswapV2TokenInfo } from "@core/util/getUniswapV2TokenInfo"
import type { EthNetworkId } from "@talismn/chaindata-provider"
import { isAbortError, isErrorOfName } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
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
        if (!isErrorOfName(cause, "ContractFunctionExecutionError")) throw cause
        if (isAbortError(cause)) return undefined

        // try erc20 contract
        return await getErc20TokenInfo(publicClient, evmNetworkId, contractAddress)
      }
    },
    enabled: !!evmNetworkId && !!publicClient && !!contractAddress,
  })

  return { isLoading, error, token }
}
