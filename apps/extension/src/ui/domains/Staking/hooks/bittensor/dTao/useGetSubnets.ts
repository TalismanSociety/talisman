import { isNotNil } from "@talismn/util"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createQueryStoragePersister } from "@ui/hooks/queryStoragePersister"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import type { SubnetSummary } from "./types"

type DynamicInfoEntry = {
  netuid: number
  tempo: number
  tao_in_emission: bigint
} | null

export const useGetSubnets = (networkId: string) => {
  const { data: sapi, isLoading: isSapiLoading } = useScaleApi(networkId)

  const query = useQuery<SubnetSummary[]>({
    queryKey: ["subnets", "onchain", sapi?.id],
    queryFn: async () => {
      if (!sapi) return []

      const dynamicInfos = await sapi.getRuntimeCallValue<DynamicInfoEntry[]>(
        "SubnetInfoRuntimeApi",
        "get_all_dynamic_info",
        []
      )

      return dynamicInfos.filter(isNotNil).map(
        (info): SubnetSummary => ({
          netuid: info.netuid,
          emission: info.tao_in_emission.toString(),
          tempo: info.tempo,
        })
      )
    },
    enabled: !!sapi,
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnReconnect: true,
    placeholderData: keepPreviousData,
    persister: createQueryStoragePersister(),
  })

  return { ...query, isLoading: isSapiLoading || query.isLoading }
}
