import type { bittensor } from "@polkadot-api/descriptors"
import { useQuery } from "@tanstack/react-query"

import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

export type GetDynamicInfoResult =
  (typeof bittensor)["descriptors"]["apis"]["SubnetInfoRuntimeApi"]["get_dynamic_info"][1]

export const useSubnetDynamicInfo = ({ netuid }: { netuid: number | null }) => {
  const { data: sapi } = useScaleApi("bittensor")

  const fetchSubnetDynamicInfo = async ({
    netuid,
  }: {
    netuid: number | null
  }): Promise<GetDynamicInfoResult> => {
    const result = await sapi?.getRuntimeCallValue<GetDynamicInfoResult>(
      "SubnetInfoRuntimeApi",
      "get_dynamic_info",
      [netuid],
    )
    return result
  }

  return useQuery({
    queryKey: ["fetchSubnetDynamicInfo", netuid],
    queryFn: () => fetchSubnetDynamicInfo({ netuid }),
    staleTime: 1000 * 10, // 10 seconds
    enabled: !!sapi && !!netuid,
    retry: 10,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // tryDelay is set to double (starting at 1000ms) with each attempt, but not exceed 30 seconds
  })
}
