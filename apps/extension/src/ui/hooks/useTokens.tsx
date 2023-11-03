import {
  allTokensMapState,
  allTokensState,
  tokensWithTestnetsMapState,
  tokensWithTestnetsState,
  tokensWithoutTestnetsMapState,
  tokensWithoutTestnetsState,
} from "@ui/atoms/chaindata"
import { useMemo } from "react"
import { useRecoilValue } from "recoil"

type TokensFilter = "all" | "enabledWithTestnets" | "enabledWithoutTestnets"

export const useTokens = (filter: TokensFilter) => {
  const allTokens = useRecoilValue(allTokensState)
  const allTokensMap = useRecoilValue(allTokensMapState)
  const tokensWithTestnets = useRecoilValue(tokensWithTestnetsState)
  const tokensWithoutTestnets = useRecoilValue(tokensWithoutTestnetsState)
  const tokensWithTestnetsMap = useRecoilValue(tokensWithTestnetsMapState)
  const tokensWithoutTestnetsMap = useRecoilValue(tokensWithoutTestnetsMapState)

  return useMemo(() => {
    switch (filter) {
      case "all":
        return { tokens: allTokens, tokensMap: allTokensMap }
      case "enabledWithTestnets":
        return { tokens: tokensWithTestnets, tokensMap: tokensWithTestnetsMap }
      case "enabledWithoutTestnets":
      default:
        return { tokens: tokensWithoutTestnets, tokensMap: tokensWithoutTestnetsMap }
    }
  }, [
    allTokens,
    allTokensMap,
    filter,
    tokensWithTestnets,
    tokensWithTestnetsMap,
    tokensWithoutTestnets,
    tokensWithoutTestnetsMap,
  ])
}

export default useTokens
