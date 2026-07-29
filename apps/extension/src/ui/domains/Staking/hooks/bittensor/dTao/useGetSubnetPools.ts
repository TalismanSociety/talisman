import { useQuery } from "@tanstack/react-query"

import { shouldRetryTaoDataApiError, taoDataApi, toTaoDataApiError } from "@ui/util/taoDataApi"

export function useGetSubnetPools({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["taoData", "subnetPools"],
    enabled,
    queryFn: async ({ signal }) => {
      try {
        return (await taoDataApi.pools.listPools({ signal })).data
      } catch (error) {
        throw toTaoDataApiError(error, "Failed to load subnet pools")
      }
    },
    retry: shouldRetryTaoDataApiError,
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnReconnect: true,
  })
}
