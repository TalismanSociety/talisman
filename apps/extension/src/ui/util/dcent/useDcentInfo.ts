import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import { DcentError, DcentInfo } from "extension-core/src/domains/dcent/types"

import { dcent } from "./dcent"

export const useDcentInfo = (options: UseQueryOptions = {}) => {
  return useQuery({
    queryKey: ["useDcentInfo"],
    queryFn: dcent.getInfo,
    ...options,
  }) as UseQueryResult<DcentInfo | null, DcentError>
}
