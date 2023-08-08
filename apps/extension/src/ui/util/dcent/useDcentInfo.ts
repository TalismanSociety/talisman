import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"

import { dcent } from "./dcent"
import { DcentError, DcentInfo } from "./types"

export const useDcentInfo = (options: UseQueryOptions = {}) => {
  return useQuery({
    queryKey: ["useDcentInfo"],
    queryFn: dcent.getInfo,
    ...options,
  }) as UseQueryResult<DcentInfo | null, DcentError>
}
