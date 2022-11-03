import type { TokenId } from "@core/domains/tokens/types"
import { useMemo } from "react"

import useTokens from "./useTokens"

const useToken = (id?: TokenId) => {
  const tokens = useTokens()

  return useMemo(() => tokens.find((token) => token.id === id), [tokens, id])
}

export default useToken
