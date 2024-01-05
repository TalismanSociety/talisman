import { TokensQueryOptions, tokensArrayQuery, tokensMapQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useTokens = (options: TokensQueryOptions) => {
  const tokens = useRecoilValue(tokensArrayQuery(options))
  const tokensMap = useRecoilValue(tokensMapQuery(options))

  return { tokens, tokensMap }
}

export default useTokens
