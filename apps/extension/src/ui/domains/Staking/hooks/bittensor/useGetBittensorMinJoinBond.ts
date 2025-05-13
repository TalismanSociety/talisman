import { SUBTENSOR_MIN_STAKE_AMOUNT_PLANK } from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"
import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { StakeType } from "../../Bittensor/hooks/useBittensorBondWizard"

type GetBittensorMinJoinBond = {
  chainId: ChainId | null | undefined
  stakeType: StakeType
}

export const useGetBittensorMinJoinBond = ({ chainId, stakeType }: GetBittensorMinJoinBond) => {
  const { data: sapi } = useScaleApi(chainId)

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
