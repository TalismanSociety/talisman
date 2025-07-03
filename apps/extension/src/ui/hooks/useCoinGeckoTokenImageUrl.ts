import { getGithubTokenLogoUrlByCoingeckoId } from "@talismn/chaindata-provider"
import { useMemo } from "react"

import { useTokens } from "@ui/state"

export const useCoinGeckoTokenImageUrl = (coingeckoTokenId: string | null | undefined) => {
  const tokens = useTokens()

  return useMemo(
    () =>
      coingeckoTokenId && tokens.some((t) => t.id === coingeckoTokenId)
        ? getGithubTokenLogoUrlByCoingeckoId(coingeckoTokenId)
        : null,
    [coingeckoTokenId, tokens],
  )
}
