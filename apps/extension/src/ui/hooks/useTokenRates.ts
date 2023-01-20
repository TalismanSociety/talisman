import { TokenId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useTokenRatesMap } from "./useTokenRatesMap"

export const useTokenRates = (tokenId?: TokenId | null) => {
  const tokenRatesMap = useTokenRatesMap()

  return useMemo(() => (tokenId ? tokenRatesMap[tokenId] : undefined), [tokenId, tokenRatesMap])
}
