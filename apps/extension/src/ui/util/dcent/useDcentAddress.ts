import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import DcentWebConnector from "dcent-web-connector"

import { DcentError, dcentCall } from "./dcentCall"

type DcentResponseAddress = {
  address: string
}

export const useDcentAddress = (
  coinType: string,
  keyPath: string,
  options: UseQueryOptions = {}
) => {
  return useQuery({
    queryKey: ["useDcentAddress", coinType, keyPath],
    queryFn: async () => {
      if (!coinType || !keyPath) return null
      return dcentCall<DcentResponseAddress>(() => DcentWebConnector.getAddress(coinType, keyPath))
    },
    ...options,
  }) as UseQueryResult<DcentResponseAddress | null, DcentError>
}
