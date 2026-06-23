import { useQuery } from "@tanstack/react-query"

import { createQueryStoragePersister } from "@ui/hooks/queryStoragePersister"

import { shouldRetryTaoDataApiError, taoDataApi, toTaoDataApiError } from "@ui/util/taoDataApi"

export function useGetValidatorsYield({ netuid }: { netuid: number | null | undefined }) {
  return useQuery({
    queryKey: ["taoData", "validatorsYield", netuid] as const,
    queryFn: async ({ signal }) => {
      try {
        return (await taoDataApi.subnets.listSubnetValidators(String(netuid!), { signal })).data
      } catch (error) {
        throw toTaoDataApiError(error, "Failed to load subnet validators")
      }
    },
    persister: createQueryStoragePersister(),
    enabled: typeof netuid === "number",
    retry: shouldRetryTaoDataApiError,
    staleTime: 5 * 60_000, // 5 mins
    gcTime: 10 * 60_000, // 10 mins
    refetchOnReconnect: true,
  })
}
