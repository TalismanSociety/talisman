import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"

export const useOnChainId = (address?: string) => {
  const { data: onChainId, ...rest } = useQuery({
    queryKey: ["useOnChainId", address],
    queryFn: async () => {
      if (!address) return null

      // fetch onChainId
      return (await api.accountsOnChainIdsLookupAddresses([address]))[address] ?? null
    },
    enabled: !!address,
    cacheTime: Infinity,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: () => address && onChainIdsCache.get(address)?.onChainId,
    onSuccess: (onChainId) => {
      if (!address) return

      // update cache
      if (onChainId === undefined) onChainIdsCache.delete(address)
      else onChainIdsCache.set(address, { onChainId, updated: Date.now() })

      // persist cache to local storage
      persistOnChainIdsCache()
    },
  })

  return [onChainId, rest] as const
}

const cacheKey = "TalismanOnChainIdsCache"
const persistItemDuration = 15_778_476_000 // 6 months in milliseconds
const onChainIdsCache = new Map<string, { onChainId?: string | null; updated?: number }>(
  JSON.parse(localStorage.getItem(cacheKey) ?? "[]")
)
const persistOnChainIdsCache = () =>
  localStorage.setItem(
    cacheKey,
    JSON.stringify(
      Array.from(onChainIdsCache.entries())
        // remove cached items which haven't been seen in a while
        .filter(
          ([, item]) =>
            // check that the updated field exists
            item?.updated &&
            // check that the item has been updated within the persistItemDuration
            Date.now() - item.updated <= persistItemDuration
        )
    )
  )
