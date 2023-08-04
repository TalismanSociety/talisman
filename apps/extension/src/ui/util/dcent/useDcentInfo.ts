import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import DcentWebConnector from "dcent-web-connector"

import { DcentError, dcentCall } from "./dcentCall"

type DcentInfo = {
  chip: string
  version: string
  isUsbAttached: boolean
}

export const useDcentInfo = (options: UseQueryOptions = {}) => {
  return useQuery({
    queryKey: ["useDcentInfo"],
    queryFn: () => dcentCall<DcentInfo>(DcentWebConnector.info),
    ...options,
  }) as UseQueryResult<DcentInfo | null, DcentError>
}
