import { TokenId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useAllTokensMap } from "./useTokens"

const useToken = (id: TokenId | null | undefined) => {
  // DON'T DO THIS (suspenses once for each key)
  // return useAtomValue(tokenByIdAtomFamily(id))

  const tokensMap = useAllTokensMap()
  return useMemo(() => (id && tokensMap[id]) || null, [tokensMap, id])
}

export default useToken
