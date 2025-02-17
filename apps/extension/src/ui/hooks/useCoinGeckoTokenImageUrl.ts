import { githubChaindataBaseUrl } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { getCoingeckoTokensList } from "extension-core"
import { useMemo } from "react"

export const useCoinGeckoTokenImageUrl = (coingeckoTokenId: string | null | undefined) => {
  const { data: tokens } = useQuery({
    queryKey: ["useCoinGeckoTokensList"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: () => getCoingeckoTokensList(),
  })

  return useMemo(() => {
    const token = tokens?.find((t) => t.id === coingeckoTokenId)

    return !tokens || token
      ? `${githubChaindataBaseUrl}/assets/tokens/coingecko/${coingeckoTokenId}.webp`
      : null
  }, [coingeckoTokenId, tokens])
}
