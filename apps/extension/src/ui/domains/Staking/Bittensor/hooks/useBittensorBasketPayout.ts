import type { DTaoClaimTarget } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"

import { getBlockTimeMs } from "../utils/helpers"

/**
 * Fresh chain read of the target pair's claimable payout (`get_basket_payout`), refetched
 * every block while mounted. The balances stream lags: payouts are NAV quotes that move with
 * subnet pool prices, and the entitlement can be claimed from another device. Submission
 * gates on this read, never on the cached stream — and a refetch error drops `isSuccess`,
 * which closes the gate rather than trusting the stale value.
 */
export const useBittensorBasketPayout = (
  sapi: ScaleApi | null | undefined,
  target: DTaoClaimTarget | null
) =>
  useQuery({
    queryKey: ["useBittensorBasketPayout", sapi?.id, target?.address, target?.hotkey],
    queryFn: async () => {
      if (!sapi || !target) throw new Error("Chain connection not ready")
      return sapi.getRuntimeCallValue<bigint>("BetaBasketRuntimeApi", "get_basket_payout", [
        target.hotkey,
        target.address,
      ])
    },
    enabled: !!sapi && !!target,
    refetchInterval: sapi ? getBlockTimeMs(sapi) : false,
  })
