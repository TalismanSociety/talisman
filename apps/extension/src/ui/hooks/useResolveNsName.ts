import { NsLookupType, isPotentialAzns, isPotentialEns } from "@talismn/on-chain-id"
import { isEthereumAddress } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useState } from "react"
import { useDebounce } from "react-use"

export type Options = {
  /** Enabled by default, set to false to disable */
  ens?: boolean

  /** Enabled by default, set to false to disable */
  azns?: boolean
}

/**
 * Use this hook to resolve a string like `0xkheops.eth` or `talisman.azero` to an address.
 */
export const useResolveNsName = (resolveName?: string, options?: Options) => {
  const useEns = options?.ens !== false
  const useAzns = options?.azns !== false

  const [name, setName] = useState(resolveName)
  useDebounce(() => setName(resolveName), 750, [resolveName])

  // check if name is something we can look up
  const nsLookupName =
    // don't look up undefined
    name !== undefined &&
    // don't look up ethereum addresses
    !isEthereumAddress(name) &&
    // only look up potential ns names
    ((useEns && isPotentialEns(name)) || (useAzns && isPotentialAzns(name)))
      ? name
      : undefined

  // let caller detect if we're going to look name up or not
  const isNsLookup = nsLookupName !== undefined

  const {
    data: result,
    isFetching: isNsFetching,
    ...rest
  } = useQuery({
    queryKey: ["useResolveNsName", name],
    queryFn: async () => {
      if (!name || !isNsLookup) return null

      // resolve ns name
      return (await api.accountsOnChainIdsResolveNames([name]))[name] ?? null
    },
    enabled: isNsLookup,
    cacheTime: Infinity,
    initialData: (): [string, NsLookupType] | null => {
      if (!name) return null

      const item = nsNamesCache.get(name)
      if (!item?.result) return null

      const address = Array.isArray(item.result) ? item.result[0] : null ?? null
      const nsLookupType = Array.isArray(item.result) ? item.result[1] : null ?? null
      if (!address || !nsLookupType) return null

      return [address, nsLookupType]
    },
    onSuccess: (result) => {
      if (!name) return

      // update cache
      if (result === undefined) nsNamesCache.delete(name)
      else nsNamesCache.set(name, { result, updated: Date.now() })

      // persist cache to local storage
      persistNsNamesCache()
    },
  })

  const [address, nsLookupType] = result ?? [null, null]

  return [address, { isNsLookup, nsLookupType, isNsFetching, ...rest }] as const
}

const cacheKey = "TalismanNsNamesCache"
const persistItemDuration = 15_778_476_000 // 6 months in milliseconds
const nsNamesCache = new Map<string, { result?: [string, NsLookupType] | null; updated?: number }>(
  JSON.parse(localStorage.getItem(cacheKey) ?? "[]")
)
const persistNsNamesCache = () =>
  localStorage.setItem(
    cacheKey,
    JSON.stringify(
      Array.from(nsNamesCache.entries())
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

/** Removes any data left over in the @deprecated cache */
localStorage.removeItem("TalismanEnsNamesCache")
