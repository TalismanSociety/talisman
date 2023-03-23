import { dbCacheState } from "@ui/atoms"
import { selector, useRecoilValue } from "recoil"

import { useDbCacheSubscription } from "./useDbCacheSubscription"

const tokenRatesState = selector({
  key: "tokenRatesState",
  get: ({ get }) => {
    const { tokenRatesMap } = get(dbCacheState)
    return tokenRatesMap
  },
})

export const useTokenRatesMap = () => {
  // keep db table up to date
  useDbCacheSubscription("tokenRates")

  return useRecoilValue(tokenRatesState)
}
