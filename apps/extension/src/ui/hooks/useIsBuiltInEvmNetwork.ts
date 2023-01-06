import { chaindataProvider } from "@core/rpcs/chaindata"
import { EvmNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

export const useIsBuiltInEvmNetwork = (evmNetworkId?: EvmNetworkId) => {
  return useQuery({
    queryKey: ["useIsBuiltInEvmNetwork", evmNetworkId],
    queryFn: () => (evmNetworkId ? chaindataProvider.getIsBuiltInEvmNetwork(evmNetworkId) : false),
  })
}
