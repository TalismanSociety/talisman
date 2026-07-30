import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useTaoDashboardNetworkId } from "../shared/TaoDashboardNetworkProvider"
import { raoToTao } from "../shared/util"

/**
 * Current TAO-per-alpha pool price of every subnet, keyed by netuid, in TAO — one
 * `SwapRuntimeApi.current_alpha_price_all` runtime call covering the whole table.
 */
export const useAlphaPricesByNetuid = () => {
  const { data: sapi } = useScaleApi(useTaoDashboardNetworkId())

  return useQuery({
    queryKey: ["alphaPricesByNetuid", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null

      const prices = await sapi.getRuntimeCallValue<{ netuid: number; price: bigint }[]>(
        "SwapRuntimeApi",
        "current_alpha_price_all",
        []
      )

      return new Map(prices.map(({ netuid, price }) => [netuid, raoToTao(price)]))
    },
    enabled: !!sapi,
    refetchInterval: 60_000,
    // no keepPreviousData: the key only changes on network switch, so the previous data
    // would always be the other network's prices
  })
}
