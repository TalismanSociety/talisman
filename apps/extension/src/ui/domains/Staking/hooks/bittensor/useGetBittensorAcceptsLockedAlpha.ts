import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type UseGetBittensorAcceptsLockedAlphaInputs = {
  networkId: DotNetworkId | null | undefined
  address: string | null | undefined
}

// bit 0 of SubtensorModule.AccountFlags: set = coldkey opted in to receive locked alpha
const ACCOUNT_FLAGS_ACCEPT_LOCKED_ALPHA = 1n

/**
 * Reads whether a coldkey has opted in to receive conviction-locked alpha (spec 421+).
 *
 * Since spec 421, a `transfer_stake` whose amount exceeds the sender's available (unlocked) stake
 * carries the lock + pro-rata conviction to the recipient — and the chain REVERTS it with
 * `AccountRejectsLockedAlpha` unless the destination coldkey opted in via
 * `set_reject_locked_alpha(false)`. Coldkeys reject by default.
 *
 * Returns:
 * - `true`  — opted in, the locked transfer will go through
 * - `false` — rejects (the default; storage key absent reads as 0 = reject)
 * - `null`  — unknown: older runtime without the `AccountFlags` storage item, or no address.
 *             Callers must NOT block on `null` (pre-421 chains allow the transfer).
 */
export const useGetBittensorAcceptsLockedAlpha = ({
  networkId,
  address,
}: UseGetBittensorAcceptsLockedAlphaInputs) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useGetBittensorAcceptsLockedAlpha", sapi?.id, address],
    queryFn: async (): Promise<boolean | null> => {
      if (!sapi || !address) return null
      try {
        const flags = await sapi.getStorage<bigint>("SubtensorModule", "AccountFlags", [address])
        // ValueQuery default 0: an absent key (null) means no accept bit => rejects
        return (
          ((flags ?? 0n) & ACCOUNT_FLAGS_ACCEPT_LOCKED_ALPHA) === ACCOUNT_FLAGS_ACCEPT_LOCKED_ALPHA
        )
      } catch {
        // pre-spec-421 runtime has no AccountFlags storage item: unknown, don't block
        return null
      }
    },
    enabled: !!sapi && !!address,
    refetchInterval: 12_000,
  })
}
