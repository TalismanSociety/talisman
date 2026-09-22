import type { DTaoClaimTarget } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import type { BittensorBasketClaimPreview } from "../utils/claimGate"
import { getBlockTimeMs } from "../utils/helpers"

/**
 * Fresh chain read of what claiming the target pair would pay (`get_basket_claim_preview`,
 * spec 468), refetched every block while mounted. The balances stream lags: payouts are NAV
 * quotes that move with subnet pool prices, and the entitlement can be claimed from another
 * device. Submission gates on this read, never on the cached stream — and a refetch error
 * drops `isSuccess`, which closes the gate rather than trusting the stale value.
 *
 * Resolves to null when the chain owes the pair nothing (`None`). A runtime without the api
 * (lagging devnet) never enters the query, so the gate stays closed there.
 */
export const useBittensorBasketClaimPreview = (
  sapi: ScaleApi | null | undefined,
  target: DTaoClaimTarget | null
) => {
  const isApiSupported = !!sapi?.isApiAvailable("BetaBasketRuntimeApi", "get_basket_claim_preview")
  const blockTimeMs = useMemo(() => (sapi ? getBlockTimeMs(sapi) : null), [sapi])

  return useQuery({
    queryKey: ["useBittensorBasketClaimPreview", sapi?.id, target?.address, target?.hotkey],
    queryFn: async (): Promise<BittensorBasketClaimPreview | null> => {
      if (!sapi || !target) throw new Error("Chain connection not ready")
      const preview = await sapi.getRuntimeCallValue<BittensorBasketClaimPreview | undefined>(
        "BetaBasketRuntimeApi",
        "get_basket_claim_preview",
        [target.hotkey, target.address]
      )
      return preview ?? null
    },
    enabled: isApiSupported && !!target,
    refetchInterval: blockTimeMs ?? false,
  })
}
