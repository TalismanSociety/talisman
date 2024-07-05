import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import { DcentDeviceInfo, DcentError } from "extension-core/src/domains/dcent/types"

import { dcent } from "./dcent"

export const useDcentDeviceInfo = (options: UseQueryOptions = {}) => {
  const result = useQuery({
    queryKey: ["useDcentDeviceInfo"],
    queryFn: dcent.getDeviceInfo,
    ...options,
  }) as UseQueryResult<DcentDeviceInfo | null, DcentError>

  return result
}
