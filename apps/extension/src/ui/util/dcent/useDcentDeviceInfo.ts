import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"

import { dcent } from "./dcent"
import { DcentDeviceInfo, DcentError } from "./types"

export const useDcentDeviceInfo = (options: UseQueryOptions = {}) => {
  const result = useQuery({
    queryKey: ["useDcentDeviceInfo"],
    queryFn: dcent.getDeviceInfo,
    ...options,
  }) as UseQueryResult<DcentDeviceInfo | null, DcentError>

  return result
}
