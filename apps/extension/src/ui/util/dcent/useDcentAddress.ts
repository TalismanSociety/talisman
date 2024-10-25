import { useQuery, UseQueryResult } from "@tanstack/react-query"

import { dcent } from "./dcent"
import { DcentAccountAddress, DcentError } from "./types"

export const useDcentAddress = (coinType: string, keyPath: string) => {
  return useQuery({
    queryKey: ["useDcentAddress", coinType, keyPath],
    queryFn: () => {
      if (!coinType || !keyPath) return null
      return dcent.getAddress(coinType, keyPath)
    },
  }) as UseQueryResult<DcentAccountAddress | null, DcentError>
}
