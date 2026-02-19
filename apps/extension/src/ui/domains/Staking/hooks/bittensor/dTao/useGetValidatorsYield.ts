import { useQuery } from "@tanstack/react-query"

import { shouldRetryTaoDataApiError, taoDataApi, toTaoDataApiError } from "./taoDataApi"
import type { ValidatorYield } from "./types"

export function useGetValidatorsYield({ netuid }: { netuid: number }) {
  return useQuery<ValidatorYield[]>({
    queryKey: ["taoData", "validatorsYield", netuid],
    queryFn: async ({ signal }) => {
      try {
        return (await taoDataApi.subnets.listSubnetValidators(String(netuid), { signal })).data
      } catch (error) {
        throw toTaoDataApiError(error, "Failed to load subnet validators")
      }
    },
    enabled: typeof netuid === "number",
    retry: shouldRetryTaoDataApiError,
    staleTime: 5 * 60 * 1000, // 5 mins
    gcTime: 10 * 60 * 1000, // 10 mins
    refetchOnReconnect: true,
  })
}
