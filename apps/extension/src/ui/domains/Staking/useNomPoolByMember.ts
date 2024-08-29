import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useNomPoolByMember = (
  chainId: ChainId | null | undefined,
  address: string | null | undefined
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolByMember", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null
      const result = await sapi.getStorage<{ pool_id: number; points: bigint } | null>(
        "NominationPools",
        "PoolMembers",
        [address]
      )
      return result ? { poolId: result.pool_id, points: result.points } : null
    },
  })
}
