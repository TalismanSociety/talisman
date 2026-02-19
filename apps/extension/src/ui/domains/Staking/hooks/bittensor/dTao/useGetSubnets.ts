import { useQuery } from "@tanstack/react-query"

import { shouldRetryTaoDataApiError, taoDataApi, toTaoDataApiError } from "./taoDataApi"
import type { SubnetSummary } from "./types"

export const useGetSubnets = () => {
  return useQuery<SubnetSummary[]>({
    queryKey: ["taoData", "subnets"],
    queryFn: async ({ signal }) => {
      try {
        return (await taoDataApi.subnets.listSubnets({ signal })).data
      } catch (error) {
        throw toTaoDataApiError(error, "Failed to load subnets")
      }
    },
    retry: shouldRetryTaoDataApiError,
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnReconnect: true,
  })
}
