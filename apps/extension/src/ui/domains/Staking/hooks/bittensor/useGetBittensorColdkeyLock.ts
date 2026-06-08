import { type GetColdkeyLockResult, toBigIntValue } from "@talismn/balances"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type UseGetBittensorColdkeyLockInputs = {
  networkId: DotNetworkId | null | undefined
  address: string | null | undefined
  netuid: number | null | undefined
}

/**
 * Reads the freshly rolled-forward conviction lock for a (coldkey, netuid) straight from chain via
 * `StakeInfoRuntimeApi.get_coldkey_lock`, returning its `locked_mass` in planck (0n if no lock).
 *
 * Balance subscriptions only poll every ~6s, so the cached lock can be stale-low while a lock GROWS
 * (subnet-owner auto-lock every block, or a concurrent top-up). Unstake flows use this to tighten
 * their available-to-unstake guard right before signing, avoiding a `StakeUnavailable` revert.
 */
export const useGetBittensorColdkeyLock = ({
  networkId,
  address,
  netuid,
}: UseGetBittensorColdkeyLockInputs) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useGetBittensorColdkeyLock", sapi?.id, address, netuid],
    queryFn: async () => {
      if (!sapi || !address || typeof netuid !== "number") return null
      // older runtimes without the lock feature: skip the call rather than throw
      if (!sapi.isApiAvailable("StakeInfoRuntimeApi", "get_coldkey_lock")) return null

      const result = await sapi.getRuntimeCallValue<GetColdkeyLockResult>(
        "StakeInfoRuntimeApi",
        "get_coldkey_lock",
        [address, netuid]
      )
      // locked_mass is a plain balance (unlike the U64F64 conviction field): no fractional shift
      return toBigIntValue(result?.locked_mass)
    },
    enabled: !!sapi && !!address && typeof netuid === "number",
    refetchInterval: 6_000,
  })
}
