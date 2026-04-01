import type { TokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { api } from "@ui/api"
import { useEffect, useMemo } from "react"

export const useAdditionalTokenRates = (tokenIds: (TokenId | null | undefined)[]) => {
  // array object may change every render, convert to string to limit useEffect triggers
  const strTokenIds = useMemo(() => tokenIds.filter(isNotNil).join("|"), [tokenIds])

  useEffect(() => {
    if (strTokenIds) {
      const tokenIds = strTokenIds.split("|")
      if (tokenIds.length) api.registerAdditionalTokenRates(tokenIds)
    }
  }, [strTokenIds])
}
