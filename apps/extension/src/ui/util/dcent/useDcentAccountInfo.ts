import { useQuery, UseQueryResult } from "@tanstack/react-query"

import { dcent } from "./dcent"
import { DcentAccountInfo, DcentError } from "./types"

export const useDcentAccountInfo = () => {
  return useQuery({
    queryKey: ["useDcentAccounts"],
    queryFn: dcent.getAccountInfo,
  }) as UseQueryResult<DcentAccountInfo, DcentError>
}
