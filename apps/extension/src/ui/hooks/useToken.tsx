import type { TokenId } from "@core/domains/tokens/types"

import useTokens from "./useTokens"

const useToken = (id: TokenId | null | undefined) => {
  const { tokensMap } = useTokens(true)

  return id ? tokensMap[id] : undefined
}

export default useToken
