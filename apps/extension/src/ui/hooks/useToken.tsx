import type { TokenId } from "@core/domains/tokens/types"
import { dbCacheState } from "@ui/atoms"
import { selectorFamily, useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

const tokenQuery = selectorFamily({
  key: "tokenQuery",
  get:
    (id: string | null | undefined) =>
    ({ get }) => {
      const { tokensWithTestnetsMap } = get(dbCacheState)
      return id ? tokensWithTestnetsMap[id] : undefined
    },
})

const useToken = (id: TokenId | null | undefined) => {
  // keep db table up to date
  useDbCacheSubscription("tokens")

  return useRecoilValue(tokenQuery(id))
}

export default useToken
