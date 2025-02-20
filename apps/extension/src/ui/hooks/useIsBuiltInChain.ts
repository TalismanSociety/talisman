import { ChainId, fetchChain } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

export const useIsBuiltInChain = (chainId?: ChainId) => {
  return useQuery({
    queryKey: ["useIsBuiltInChain", chainId],
    queryFn: async () => {
      if (!chainId) return false
      const chain = await fetchChain(chainId)
      return Boolean(chain)
    },
  })
}
