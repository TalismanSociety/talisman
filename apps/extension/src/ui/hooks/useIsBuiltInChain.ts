import { ChainId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { chaindataProvider } from "extension-core"

export const useIsBuiltInChain = (chainId?: ChainId) => {
  return useQuery({
    queryKey: ["useIsBuiltInChain", chainId],
    queryFn: () => (chainId ? chaindataProvider.getIsBuiltInChain(chainId) : false),
  })
}
