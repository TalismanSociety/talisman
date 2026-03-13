import type { Token } from "@talismn/chaindata-provider"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createQueryStoragePersister } from "@ui/hooks/queryStoragePersister"

import { type CoingeckoCategoryItem, fetchCoingeckoCoinsByCategory } from "./coingecko"

type MapCoingeckoCategoryTokenIdsParams = {
  tokenIds: string[]
  tokensMap: Record<string, Token | undefined>
  categoryCoins: CoingeckoCategoryItem[]
}

export const mapCoingeckoCategoryTokenIds = ({
  tokenIds,
  tokensMap,
  categoryCoins,
}: MapCoingeckoCategoryTokenIdsParams): string[] => {
  const tokenIdsByCoingeckoId = new Map<string, string[]>()

  for (const tokenId of tokenIds) {
    const coingeckoId = tokensMap[tokenId]?.coingeckoId?.toLowerCase()
    if (!coingeckoId) continue

    const existing = tokenIdsByCoingeckoId.get(coingeckoId)
    if (existing) existing.push(tokenId)
    else tokenIdsByCoingeckoId.set(coingeckoId, [tokenId])
  }

  const seenTokenIds = new Set<string>()
  return categoryCoins.flatMap((coin) => {
    const matchingTokenIds = tokenIdsByCoingeckoId.get(coin.id.toLowerCase()) ?? []
    return matchingTokenIds.filter((tokenId) => {
      if (seenTokenIds.has(tokenId)) return false
      seenTokenIds.add(tokenId)
      return true
    })
  })
}

const fetchCoingeckoCategoryTokenIds = async (
  categoryId: string,
  tokenIds: string[],
  tokensMap: Record<string, Token | undefined>
): Promise<string[]> => {
  const categoryCoins = await fetchCoingeckoCoinsByCategory(categoryId)

  return mapCoingeckoCategoryTokenIds({
    tokenIds,
    tokensMap,
    categoryCoins,
  })
}

type UseCoingeckoCategoryTokenIdsParams = {
  categoryId?: string
  tokenIds?: string[]
  tokensMap: Record<string, Token | undefined>
}

export const useCoingeckoCategoryTokenIds = ({
  categoryId,
  tokenIds,
  tokensMap,
}: UseCoingeckoCategoryTokenIdsParams) => {
  return useQuery({
    queryKey: ["swap-coingecko-category-token-ids-v2", categoryId ?? null, tokenIds ?? []],
    queryFn: () => {
      if (!categoryId || !tokenIds?.length) return []
      return fetchCoingeckoCategoryTokenIds(categoryId, tokenIds, tokensMap)
    },
    enabled: Boolean(categoryId && tokenIds?.length),
    placeholderData: keepPreviousData,
    persister: createQueryStoragePersister(),
  })
}
