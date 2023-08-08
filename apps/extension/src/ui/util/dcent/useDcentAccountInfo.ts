import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"

import { dcent } from "./dcent"
import { DcentAccountInfo, DcentError } from "./types"

export const useDcentAccountInfo = (options: UseQueryOptions = {}) => {
  return useQuery({
    queryKey: ["useDcentAccounts"],
    queryFn: dcent.getAccountInfo,
    ...options,
  }) as UseQueryResult<DcentAccountInfo, DcentError>
}
