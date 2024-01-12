import { TokensQueryOptions, tokensArrayQuery, tokensMapQuery } from "@ui/atoms"
import { useRecoilValue, waitForAll } from "recoil"

export const useTokens = (options: TokensQueryOptions) => {
  const [tokens, tokensMap] = useRecoilValue(
    waitForAll([tokensArrayQuery(options), tokensMapQuery(options)])
  )

  return { tokens, tokensMap }
}

export default useTokens
