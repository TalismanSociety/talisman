import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { chaindataProvider } from "@ui/domains/Chains/chaindataProvider"

export const useIsBuiltInEvmNetwork = (evmNetworkId?: EvmNetworkId) => {
  return useQuery({
    queryKey: ["useIsBuiltInEvmNetwork", evmNetworkId],
    queryFn: () => (evmNetworkId ? chaindataProvider.getIsBuiltInEvmNetwork(evmNetworkId) : false),
  })
}
