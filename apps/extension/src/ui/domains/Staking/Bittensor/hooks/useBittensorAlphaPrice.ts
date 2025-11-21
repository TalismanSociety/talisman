import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type UseBittensorAlphaPriceInputs = {
  networkId: DotNetworkId | null | undefined
  netuid: number | null | undefined
}

export const useBittensorAlphaPrice = ({ networkId, netuid }: UseBittensorAlphaPriceInputs) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useBittensorAlphaPrice", sapi?.id, netuid],
    queryFn: async () => {
      if (!sapi || !netuid) return null

      return sapi.getRuntimeCallValue<bigint>("SwapRuntimeApi", "current_alpha_price", [netuid])
    },
    refetchInterval: 2_000, // refresh often to account for changes in mempool
  })
}
