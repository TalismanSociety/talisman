import { useQuery, UseQueryResult } from "@tanstack/react-query"

import { dcent } from "./dcent"
import { DcentDeviceInfo, DcentError } from "./types"

export const useDcentDeviceInfo = () => {
  const result = useQuery({
    queryKey: ["useDcentDeviceInfo"],
    queryFn: dcent.getDeviceInfo,
  }) as UseQueryResult<DcentDeviceInfo | null, DcentError>

  return result
}
