import { useQuery } from "@tanstack/react-query"

import { createQueryStoragePersister } from "@ui/hooks/useQueryStorage"

import { shouldRetryTaoDataApiError, taoDataApi, toTaoDataApiError } from "./taoDataApi"

export function useGetValidatorsYield({ netuid }: { netuid: number }) {
  return useQuery({
    queryKey: ["taoData", "validatorsYield", netuid] as const,
    queryFn: async ({ signal }) => {
      try {
        return (await taoDataApi.subnets.listSubnetValidators(String(netuid), { signal })).data
      } catch (error) {
        throw toTaoDataApiError(error, "Failed to load subnet validators")
      }
    },
    persister: createQueryStoragePersister({
      key: `validatorsYield:${netuid}`,
      maxAge: 10 * 60_000,
    }),
    enabled: typeof netuid === "number",
    retry: shouldRetryTaoDataApiError,
    staleTime: 5 * 60_000, // 5 mins
    gcTime: 10 * 60_000, // 10 mins
    refetchOnReconnect: true,
  })
}
