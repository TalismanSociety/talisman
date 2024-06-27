import { ChainId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { chaindataProvider } from "@ui/domains/Chains/chaindataProvider"

export const useIsBuiltInChain = (chainId?: ChainId) => {
  return useQuery({
    queryKey: ["useIsBuiltInChain", chainId],
    queryFn: () => (chainId ? chaindataProvider.getIsBuiltInChain(chainId) : false),
  })
}
