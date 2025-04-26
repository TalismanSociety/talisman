import { Token } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { useMemo } from "react"

import { useTokensMap } from "@ui/state"

import { getTokenFromCoinbaseAsset } from "../shared/helpers"
import { useCoinbaseSellOptions } from "./useCoinbaseSellOptions"

export const useCoinbaseSellTokens = () => {
  const { data: coinbaseBuyOptions, isLoading, error } = useCoinbaseSellOptions()

  const talismanTokens = useTokensMap({ activeOnly: false, includeTestnets: false })

  const tokens = useMemo<Token[] | undefined>(() => {
    return coinbaseBuyOptions?.sell_currencies
      .flatMap((c) => c.networks)
      .map((n) => getTokenFromCoinbaseAsset(n, talismanTokens))
      .filter(isNotNil)
  }, [coinbaseBuyOptions?.sell_currencies, talismanTokens])

  return { tokens, isLoading, error }
}
