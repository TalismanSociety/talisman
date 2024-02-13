import { TokenId } from "@talismn/chaindata-provider"
import { useAtomValue } from "jotai"

import { tokenRatesAtom } from "../atoms/tokenRates"

export const useTokenRates = () => {
  return useAtomValue(tokenRatesAtom)
}

export function useTokenRate(tokenId?: TokenId) {
  const tokenRates = useTokenRates()
  return tokenId ? tokenRates[tokenId] : undefined
}
