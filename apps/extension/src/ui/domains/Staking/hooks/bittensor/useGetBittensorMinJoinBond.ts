import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { SUBTENSOR_MIN_STAKE_AMOUNT_PLANK } from "./dTao/constants"

type GetBittensorMinJoinBond = {
  networkId: DotNetworkId | null | undefined
  netuid: number | null
}

export const useGetBittensorMinJoinBond = ({ networkId, netuid }: GetBittensorMinJoinBond) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useGetBittensorMinJoinBond", sapi?.id, netuid],
    queryFn: async () => {
      if (!sapi) return null

      // Root staking has dynamic value
      if (netuid === 0)
        (await sapi.getStorage<bigint>("SubtensorModule", "NominatorMinRequiredStake", [])) ?? 0n

      // TODO: figure out what the correct way to get this value is, attempting to stake with this value causes tx to fail
      return SUBTENSOR_MIN_STAKE_AMOUNT_PLANK
    },
    enabled: !!sapi,
  })
}
