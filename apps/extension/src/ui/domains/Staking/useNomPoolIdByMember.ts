import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export const useNomPoolIdByMember = (
  chainId: ChainId | null | undefined,
  address: string | null | undefined
) => {
  const { data: sapi } = useScaleApi(chainId)

  return useQuery({
    queryKey: ["useNomPoolIdByMember", sapi?.id, address],
    queryFn: async () => {
      if (!sapi || !address) return null
      const result = await sapi.getStorage<{ pool_id: number } | null>(
        "NominationPools",
        "PoolMembers",
        [address]
      )
      return result?.pool_id
    },
  })
}
