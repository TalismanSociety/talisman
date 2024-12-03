import { EvmNetworkId, fetchEvmNetwork } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

export const useIsBuiltInEvmNetwork = (evmNetworkId?: EvmNetworkId) => {
  return useQuery({
    queryKey: ["useIsBuiltInEvmNetwork", evmNetworkId],
    queryFn: async () => {
      if (!evmNetworkId) return false
      const chain = await fetchEvmNetwork(evmNetworkId)
      return Boolean(chain)
    },
  })
}
