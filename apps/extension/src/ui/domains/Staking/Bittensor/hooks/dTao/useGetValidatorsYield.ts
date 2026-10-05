import { queryOptions, useQuery } from "@tanstack/react-query"

import { createQueryStoragePersister } from "@ui/hooks/queryStoragePersister"

import { shouldRetryTaoDataApiError, taoDataApi, toTaoDataApiError } from "@ui/util/taoDataApi"

export const getValidatorsYieldQueryOptions = (netuid: number | null | undefined) =>
  queryOptions({
    queryKey: ["taoData", "validatorsYield", netuid] as const,
    queryFn: async ({ signal }) => {
      try {
        return (await taoDataApi.subnets.listSubnetValidators(String(netuid!), { signal })).data
      } catch (error) {
        throw toTaoDataApiError(error, "Failed to load subnet validators")
      }
    },
    persister: createQueryStoragePersister(),
    retry: shouldRetryTaoDataApiError,
    staleTime: 5 * 60_000, // 5 mins
    gcTime: 10 * 60_000, // 10 mins
    refetchOnReconnect: true,
  })

export function useGetValidatorsYield({ netuid }: { netuid: number | null | undefined }) {
  return useQuery({
    ...getValidatorsYieldQueryOptions(netuid),
    enabled: typeof netuid === "number",
  })
}
