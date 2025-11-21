import { useRemoteConfig } from "@ui/state/remoteConfig"

import { TALISMAN_FEE_BITTENSOR } from "../utils/constants"
import { StakeDirection } from "./types"

export const useGetSubnetFee = ({
  netuid,
  direction,
}: {
  netuid: number
  direction: StakeDirection
}): number => {
  const remoteConfig = useRemoteConfig()

  const {
    bittensor: { fee },
  } = remoteConfig

  if (direction === "alphaToTao") {
    return fee.sell[netuid] ?? TALISMAN_FEE_BITTENSOR
  }

  return fee.buy[netuid] ?? TALISMAN_FEE_BITTENSOR
}
