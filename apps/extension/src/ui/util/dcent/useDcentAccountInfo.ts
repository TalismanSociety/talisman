import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import { DcentAccountInfo, DcentError } from "extension-core/src/domains/dcent/types"

import { dcent } from "./dcent"

export const useDcentAccountInfo = (options: UseQueryOptions = {}) => {
  return useQuery({
    queryKey: ["useDcentAccounts"],
    queryFn: dcent.getAccountInfo,
    ...options,
  }) as UseQueryResult<DcentAccountInfo, DcentError>
}
