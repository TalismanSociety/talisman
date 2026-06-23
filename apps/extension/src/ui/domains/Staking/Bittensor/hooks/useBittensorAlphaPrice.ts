import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import type { DotNetworkId } from "@talismn/chaindata-provider"
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
      if (netuid === 0) return ALPHA_PRICE_SCALE
      if (!sapi || typeof netuid !== "number") return null

      return sapi.getRuntimeCallValue<bigint>("SwapRuntimeApi", "current_alpha_price", [netuid])
    },
    // netuid 0 resolves to the 1:1 constant without needing sapi. Without the gate, every consumer
    // mounting this hook with a null netuid (eg send screens on non-dtao tokens) would run a no-op
    // poll every refetch interval.
    enabled: typeof netuid === "number" && (netuid === 0 || !!sapi),
    refetchInterval: 12_000, // price may change every block
  })
}
