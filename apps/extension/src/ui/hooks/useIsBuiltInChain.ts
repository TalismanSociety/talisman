import { chaindataProvider } from "@extension/core"
import { ChainId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

export const useIsBuiltInChain = (chainId?: ChainId) => {
  return useQuery({
    queryKey: ["useIsBuiltInChain", chainId],
    queryFn: () => (chainId ? chaindataProvider.getIsBuiltInChain(chainId) : false),
  })
}
