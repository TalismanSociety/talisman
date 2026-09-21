import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import type { BasketHoldingEntry } from "../utils/basketHoldings"

/**
 * Current holdings of a root validator's beta basket (`get_validator_basket`): the subnets
 * the fund is exposed to, each valued at the realizable TAO a claim would fetch. Since spec
 * 464 funds have no declared target vector — dividends accrue in place and only the
 * validator's `swap_basket` trades move the composition — so the live holdings are the only
 * source of truth. One runtime call per hotkey: the picker rows are virtualized, so only the
 * visible validators are priced.
 */
export const useBittensorBasketHoldings = (networkId: DotNetworkId | undefined, hotkey: string) => {
  const { data: sapi, isPending: isSapiPending, isError: isSapiError } = useScaleApi(networkId)

  const query = useQuery({
    queryKey: ["useBittensorBasketHoldings", sapi?.id, hotkey],
    queryFn: async () => {
      if (!sapi) throw new Error("Chain connection not ready")
      return sapi.getRuntimeCallValue<BasketHoldingEntry[]>(
        "BetaBasketRuntimeApi",
        "get_validator_basket",
        [hotkey]
      )
    },
    enabled: !!sapi,
    staleTime: 5 * 60_000,
  })

  // useScaleApi resolving to null (metadata unavailable) leaves the holdings query
  // disabled forever: surface it as an error, not as an endless loading state
  const isSapiUnavailable = isSapiError || (!isSapiPending && !sapi)

  return {
    data: query.data,
    isError: isSapiUnavailable || query.isError,
    isLoading: !isSapiUnavailable && !query.isError && query.isPending,
  }
}
