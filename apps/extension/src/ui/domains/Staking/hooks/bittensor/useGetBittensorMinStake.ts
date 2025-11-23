import { DotNetworkId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

/**
    #[pallet::type_value]
    /// Default minimum stake.
    pub fn DefaultMinStake<T: Config>() -> TaoCurrency {
        2_000_000.into()
    }
 */
const SUBTENSOR_DEFAULT_MIN_STAKE = 2_000_000n

type GetBittensorDefaultMinStake = {
  networkId: DotNetworkId | null | undefined
}

export const useGetBittensorDefaultMinStake = ({ networkId }: GetBittensorDefaultMinStake) => {
  const { data: sapi } = useScaleApi(networkId)

  return useMemo(() => {
    // hack to keep the code below valid while not using it
    if (Date.now()) return SUBTENSOR_DEFAULT_MIN_STAKE

    try {
      return (
        // should be there but not exposed in the metadata, can't figure out why
        // https://github.com/opentensor/subtensor/blob/6304dbedc34c6b271546a9338d9b870ceb1ac625/pallets/subtensor/src/lib.rs#L882
        sapi?.getConstant<bigint>("SubtensorModule", "DefaultMinStake") ??
        SUBTENSOR_DEFAULT_MIN_STAKE
      )
    } catch {
      return SUBTENSOR_DEFAULT_MIN_STAKE
    }
  }, [sapi])
}
