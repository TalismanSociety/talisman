import { isPotentialEns } from "@talismn/on-chain-id"
import { isEthereumAddress } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"

export const useResolveEnsName = (name?: string) => {
  // check if name is something we can look up
  const lookupName =
    // don't look up undefined
    name !== undefined &&
    // don't look up ethereum addresses
    !isEthereumAddress(name) &&
    // only look up potential ens names (dot separated string e.g. `ens.eth`)
    isPotentialEns(name)
      ? name
      : undefined

  // let caller detect if we're going to look name up or not
  const isLookup = lookupName !== undefined

  const { data: address, ...rest } = useQuery({
    queryKey: ["useResolveEnsName", name],
    queryFn: async () => {
      if (!name || !isLookup) return null

      // resolve ens name
      return (await api.accountsOnChainIdsResolveNames([name]))[name] ?? null
    },
    enabled: isLookup,
    cacheTime: Infinity,
    initialData: () => name && ensNamesCache.get(name),
    onSuccess: (address) => {
      if (!name) return

      // update cache
      if (address === undefined) ensNamesCache.delete(name)
      else ensNamesCache.set(name, address)

      // persist cache to local storage
      persistEnsNamesCache()
    },
  })

  return [address, { isLookup, ...rest }] as const
}

const ensNamesCache = new Map<string, string | null>(
  JSON.parse(localStorage.getItem("TalismanEnsNamesCache") ?? "[]")
)
const persistEnsNamesCache = () =>
  localStorage.setItem("TalismanEnsNamesCache", JSON.stringify(Array.from(ensNamesCache.entries())))
