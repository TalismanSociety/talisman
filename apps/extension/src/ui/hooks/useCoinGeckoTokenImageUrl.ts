import { getCoingeckoToken } from "@extension/core"
import { getCoingeckoTokensList } from "@extension/core"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

export const useCoinGeckoTokenImageUrl = (coingeckoTokenId: string | null) => {
  // fetch exhaustive list first so we can query details only for valid ids
  // otherwise we could trigger rate limit (429) to easily, it's very sensible without api key.
  const qTokens = useQuery({
    queryKey: ["useCoinGeckoTokensList"],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: () => getCoingeckoTokensList(),
  })

  const qToken = useQuery({
    queryKey: ["useCoingeckoTokenImageUrl", qTokens.dataUpdatedAt, coingeckoTokenId],
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: () =>
      coingeckoTokenId &&
      qTokens.data &&
      Array.isArray(qTokens.data) &&
      !!qTokens.data.find((t) => t.id === coingeckoTokenId)
        ? getCoingeckoToken(coingeckoTokenId)
        : null,
  })

  return useMemo(() => qToken.data?.image?.large ?? null, [qToken.data?.image?.large])
}
