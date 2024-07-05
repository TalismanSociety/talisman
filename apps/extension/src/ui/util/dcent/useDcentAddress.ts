import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import { DcentAccountAddress, DcentError } from "extension-core/src/domains/dcent/types"

import { dcent } from "./dcent"

export const useDcentAddress = (
  coinType: string,
  keyPath: string,
  options: UseQueryOptions = {}
) => {
  return useQuery({
    queryKey: ["useDcentAddress", coinType, keyPath],
    queryFn: () => {
      if (!coinType || !keyPath) return null
      return dcent.getAddress(coinType, keyPath)
    },
    ...options,
  }) as UseQueryResult<DcentAccountAddress | null, DcentError>
}
