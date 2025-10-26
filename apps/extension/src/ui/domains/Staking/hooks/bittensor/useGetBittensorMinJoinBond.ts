import { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { StakeType } from "../../Bittensor/hooks/useBittensorBondWizard"
import { SUBTENSOR_MIN_STAKE_AMOUNT_PLANK } from "./dTao/constants"

type GetBittensorMinJoinBond = {
  networkId: DotNetworkId | null | undefined
  stakeType: StakeType
}

export const useGetBittensorMinJoinBond = ({ networkId, stakeType }: GetBittensorMinJoinBond) => {
  const { data: sapi } = useScaleApi(networkId)

  return useQuery({
    queryKey: ["useGetBittensorMinJoinBond", sapi?.id, stakeType],
    queryFn: async () => {
      if (!sapi) return null
      if (stakeType === "subnet") return SUBTENSOR_MIN_STAKE_AMOUNT_PLANK
      return (
        (await sapi.getStorage<bigint>("SubtensorModule", "NominatorMinRequiredStake", [])) ?? 0n
      )
    },
    enabled: !!sapi,
  })
}
