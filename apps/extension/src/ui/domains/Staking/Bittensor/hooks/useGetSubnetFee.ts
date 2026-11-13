import { useRemoteConfig } from "@ui/state/remoteConfig"

import { getSubnetFeePercent } from "../utils/stakingQuote"
import type { StakeDirection } from "./types"

export const useGetSubnetFee = ({
  netuid,
  direction,
}: {
  netuid: number
  direction: StakeDirection
}): number => getSubnetFeePercent(useRemoteConfig().bittensor.fee, netuid, direction)
