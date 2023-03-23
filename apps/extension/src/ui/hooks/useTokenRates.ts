import { TokenId } from "@talismn/chaindata-provider"
import { dbCacheState } from "@ui/atoms"
import { selectorFamily, useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

const tokenRatesQuery = selectorFamily({
  key: "tokenRatesQuery",
  get:
    (tokenId: TokenId | null | undefined) =>
    ({ get }) => {
      const { tokenRatesMap } = get(dbCacheState)
      return tokenId ? tokenRatesMap[tokenId] : undefined
    },
})

export const useTokenRates = (tokenId?: TokenId | null) => {
  // keep db table up to date
  useDbCacheSubscription("tokenRates")

  return useRecoilValue(tokenRatesQuery(tokenId))
}
