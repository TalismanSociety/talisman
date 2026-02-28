import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { raoToTao } from "../../../shared/util"
import { BITTENSOR_NETWORK_ID } from "../../../subnets/constants"

/**
 * Fetches the current alpha→TAO price via the on-chain
 * `SwapRuntimeApi.current_alpha_price` runtime API call.
 *
 * Refetches whenever `bestBlockNumber` changes (i.e. on every new
 * Bittensor block as observed by the realtime block watcher).
 *
 * The returned price is in TAO (e.g. 0.004231), not rao.
 */
export function useRealtimeAlphaPrice(
  netuid: number | null | undefined,
  bestBlockNumber: number | null
) {
  const { data: sapi } = useScaleApi(BITTENSOR_NETWORK_ID)

  const result = useQuery({
    queryKey: ["realtimeAlphaPrice", sapi?.id, netuid, bestBlockNumber],
    queryFn: async () => {
      if (!sapi || !netuid) return null

      const priceRao = await sapi.getRuntimeCallValue<bigint>(
        "SwapRuntimeApi",
        "current_alpha_price",
        [netuid]
      )

      // Convert from rao (u64) to TAO float
      return raoToTao(priceRao)
    },
    enabled: !!sapi && !!netuid && bestBlockNumber !== null,
    // No refetchInterval — refetch is driven by bestBlockNumber in the queryKey
    staleTime: 10_000, // treat as fresh for 10s (block time ~12s)
    placeholderData: keepPreviousData,
  })

  return result
}
