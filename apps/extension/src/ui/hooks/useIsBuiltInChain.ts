import { ChainId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

export const useIsBuiltInChain = (chainId?: ChainId) => {
  return useQuery({
    queryKey: ["useIsBuiltInChain", chainId],
    queryFn: async () => {
      throw new Error("Not implemented")
      // if (!chainId) return false
      // const chain = await fetchChain(chainId)
      // return Boolean(chain)
    },
  })
}
