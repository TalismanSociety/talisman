import type { TokenId } from "@core/domains/tokens/types"
import { useMemo } from "react"
import { useDbCache } from "./useDbData"
import { useDbDataSubscription } from "./useDbDataSubscription"

const useToken = (id?: TokenId) => {
  // keep db table up to date
  useDbDataSubscription("tokens")

  const { allTokens } = useDbCache()

  return useMemo(() => allTokens.find((token) => token.id === id), [allTokens, id])
}

export default useToken
