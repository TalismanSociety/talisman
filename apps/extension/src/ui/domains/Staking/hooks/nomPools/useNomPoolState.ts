import { ChainId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useNomPoolState = (
  chainId: ChainId | null | undefined,
  poolId: number | string | null | undefined,
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolState", chainId, poolId],
    queryFn: async () => {
      if (!sapi || typeof poolId !== "number") return null

      const [maxPoolMembers, pool] = await Promise.all([
        sapi.getStorage<number>("NominationPools", "MaxPoolMembers", []),
        sapi.getStorage<{ member_counter: number; state: { type: string } }>(
          "NominationPools",
          "BondedPools",
          [poolId],
        ),
      ])

      return {
        isFull: pool.member_counter >= (maxPoolMembers ?? Number.POSITIVE_INFINITY),
        isOpen: pool.state.type === "Open",
      }
    },
    enabled: !!sapi,
  })
}
