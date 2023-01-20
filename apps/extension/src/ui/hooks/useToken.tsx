import type { TokenId } from "@core/domains/tokens/types"
import { useMemo } from "react"

import useTokensMap from "./useTokensMap"

const useToken = (id?: TokenId | null) => {
  const tokens = useTokensMap()

  return useMemo(() => (id ? tokens[id] : undefined), [tokens, id])
}

export default useToken
