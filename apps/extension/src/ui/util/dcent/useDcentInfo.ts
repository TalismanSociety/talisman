import { useQuery, UseQueryResult } from "@tanstack/react-query"

import { dcent } from "./dcent"
import { DcentError, DcentInfo } from "./types"

export const useDcentInfo = () => {
  return useQuery({
    queryKey: ["useDcentInfo"],
    queryFn: dcent.getInfo,
  }) as UseQueryResult<DcentInfo | null, DcentError>
}
