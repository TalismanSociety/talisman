import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import type { ConvictionLockType } from "../components/BittensorLockTypePicker"

type UseBittensorCurrentLockTypeInputs = {
  networkId: DotNetworkId | null | undefined
  address: string | null | undefined
  netuid: number | null | undefined
}

/**
 * Reads the persisted decay mode for a coldkey/subnet directly from chain storage.
 *
 * `DecayingLock` can survive after the lock mass reaches zero, so the lock wizard must not infer
 * the current type only from balance locks.
 */
export const useBittensorCurrentLockType = ({
  networkId,
  address,
  netuid,
}: UseBittensorCurrentLockTypeInputs) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useBittensorCurrentLockType", sapi?.id, address, netuid],
    queryFn: async (): Promise<ConvictionLockType | null> => {
      if (!sapi || !address || typeof netuid !== "number") return null

      try {
        const decayingLock = await sapi.getStorage<boolean | null>(
          "SubtensorModule",
          "DecayingLock",
          [address, netuid]
        )
        return decayingLock === false ? "perpetual" : "decaying"
      } catch {
        return null
      }
    },
    enabled: !!sapi && !!address && typeof netuid === "number",
    refetchInterval: 6_000,
  })
}
