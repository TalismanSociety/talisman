import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

type GetBittensorMinJoinBond = {
  networkId: DotNetworkId | null | undefined
}

export const useGetBittensorMinJoinBond = ({ networkId }: GetBittensorMinJoinBond) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useGetBittensorMinJoinBond", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null

      // same for all netuids
      // also must not go below this minimum when unstaking partially
      return sapi.getStorage<bigint>("SubtensorModule", "NominatorMinRequiredStake", [])
    },
    enabled: !!sapi,
  })
}
