import type { TokenId } from "@core/domains/tokens/types"
import { useMemo } from "react"

import useTokens from "./useTokens"

const useToken = (id?: TokenId) => {
  const { tokensMap } = useTokens(true)

  return id ? tokensMap[id] : undefined
}

export default useToken
