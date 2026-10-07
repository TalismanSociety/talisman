import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useGetBittensorDefaultMinStake } from "./useGetBittensorDefaultMinStake"

type GetBittensorMinJoinBond = {
  networkId: DotNetworkId | null | undefined
}

export const useGetBittensorMinJoinBond = ({ networkId }: GetBittensorMinJoinBond) => {
  const { data: sapi } = useScaleApi(networkId)
  const defaultMinStake = useGetBittensorDefaultMinStake({ networkId })

  return useQuery({
    queryKey: ["useGetBittensorMinJoinBond", sapi?.id, defaultMinStake.toString()],
    queryFn: async () => {
      if (!sapi) return null

      // same for all netuids
      // also must not go below this minimum when unstaking partially, or the chain sweeps the rest
      // the storage holds a per-million factor of DefaultMinStake, not an amount
      const factor = await sapi.getStorage<bigint>(
        "SubtensorModule",
        "NominatorMinRequiredStake",
        []
      )
      return typeof factor === "bigint" ? (defaultMinStake * factor) / 1_000_000n : null
    },
    enabled: !!sapi,
  })
}
