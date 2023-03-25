import {
  tokensWithTestnetsMapState,
  tokensWithTestnetsState,
  tokensWithoutTestnetsMapState,
  tokensWithoutTestnetsState,
} from "@ui/atoms/chaindata"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

export const useTokens = (withTestnets: boolean) => {
  const tokensWithTestnets = useRecoilValue(tokensWithTestnetsState)
  const tokensWithoutTestnets = useRecoilValue(tokensWithoutTestnetsState)
  const tokensWithTestnetsMap = useRecoilValue(tokensWithTestnetsMapState)
  const tokensWithoutTestnetsMap = useRecoilValue(tokensWithoutTestnetsMapState)

  return useMemo(
    () => ({
      tokens: withTestnets ? tokensWithTestnets : tokensWithoutTestnets,
      tokensMap: withTestnets ? tokensWithTestnetsMap : tokensWithoutTestnetsMap,
    }),
    [
      tokensWithTestnets,
      tokensWithTestnetsMap,
      tokensWithoutTestnets,
      tokensWithoutTestnetsMap,
      withTestnets,
    ]
  )
}

export default useTokens
