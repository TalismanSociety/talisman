import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useMemo } from "react"

const SUBTENSOR_DEFAULT_MIN_STAKE = 2_000_000n

type GetBittensorDefaultMinStake = {
  networkId: DotNetworkId | null | undefined
}

export const useGetBittensorDefaultMinStake = ({ networkId }: GetBittensorDefaultMinStake) => {
  const { data: sapi } = useScaleApi(networkId)

  return useMemo(() => {
    try {
      return (
        sapi?.getConstant<bigint>("SubtensorModule", "InitialMinStake") ??
        SUBTENSOR_DEFAULT_MIN_STAKE
      )
    } catch {
      return SUBTENSOR_DEFAULT_MIN_STAKE
    }
  }, [sapi])
}
