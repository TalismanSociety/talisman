import { DotNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

const SUBTENSOR_MIN_STAKE_AMOUNT_PLANK = 1000000n

type GetBittensorDefaultMinStake = {
  networkId: DotNetworkId | null | undefined
}

export const useGetBittensorDefaultMinStake = ({ networkId }: GetBittensorDefaultMinStake) => {
  const { data: sapi } = useScaleApi(networkId)

  return useMemo(
    () =>
      sapi?.getConstant<bigint>("SubtensorModule", "DefaultMinStake") ??
      SUBTENSOR_MIN_STAKE_AMOUNT_PLANK,
    [sapi],
  )
}
