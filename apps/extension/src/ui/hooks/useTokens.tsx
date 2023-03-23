import { dbCacheState } from "@ui/atoms"
import { selectorFamily, useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

const tokenListQuery = selectorFamily({
  key: "tokenListQuery",
  get:
    (withTestnets: boolean) =>
    ({ get }) => {
      const {
        tokensWithTestnets,
        tokensWithoutTestnets,
        tokensWithTestnetsMap,
        tokensWithoutTestnetsMap,
      } = get(dbCacheState)

      return {
        tokens: withTestnets ? tokensWithTestnets : tokensWithoutTestnets,
        tokensMap: withTestnets ? tokensWithTestnetsMap : tokensWithoutTestnetsMap,
      }
    },
})

export const useTokens = (withTestnet: boolean) => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  return useRecoilValue(tokenListQuery(withTestnet))
}

export default useTokens
