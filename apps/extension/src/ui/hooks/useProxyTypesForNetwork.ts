import { getProxyTypes, type ProxyTypeInfo } from "@core/domains/accountProxies/getProxyTypes"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useDotNetwork } from "@ui/state/chaindata"
import { useEffect, useRef } from "react"

const EMPTY: ProxyTypeInfo[] = []

/**
 * Returns the `ProxyType` enum variants (name + docs) for a given network,
 * extracted from that network's runtime metadata.
 *
 * - `proxyTypes`: the list of proxy type variants (empty while loading or when the pallet is absent)
 * - `isFetched`: `true` once the metadata query has completed (success or error),
 *   allowing callers to distinguish "still loading" from "no proxy pallet"
 *
 * As a side effect, updates the proxy pallet cache in the backend after the
 * metadata query completes so the lightweight poll can skip networks without the pallet.
 */
export const useProxyTypesForNetwork = (
  networkId: DotNetworkId | null | undefined
): { proxyTypes: ProxyTypeInfo[]; isFetched: boolean } => {
  const chain = useDotNetwork(networkId)

  const { data, isFetched } = useQuery({
    queryKey: ["proxyTypesForNetwork", chain?.genesisHash],
    queryFn: async () => {
      if (!chain?.genesisHash) return EMPTY

      const metadataDef = await api.subChainMetadata(chain.genesisHash)
      if (!metadataDef) return EMPTY

      const metadataRpc = getMetadataRpcFromDef(metadataDef)
      if (!metadataRpc) return EMPTY

      return getProxyTypes(metadataRpc)
    },
    enabled: !!chain?.genesisHash,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  const proxyTypes = data ?? EMPTY
  const resolvedFetched = isFetched || !chain?.genesisHash

  // Renderer metadata can confirm pallet presence, but an empty result may be a transient fetch failure.
  const cacheUpdatedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!resolvedFetched || !networkId || typeof chain?.specVersion !== "number") return
    if (proxyTypes.length === 0) return
    const cacheKey = `${networkId}:${chain.specVersion}`
    if (cacheUpdatedRef.current === cacheKey) return
    cacheUpdatedRef.current = cacheKey
    api.accountProxiesUpdatePalletCache({
      networkId,
      specVersion: chain.specVersion,
      hasProxyPallet: true,
    })
  }, [resolvedFetched, networkId, chain?.specVersion, proxyTypes.length])

  return { proxyTypes, isFetched: resolvedFetched }
}
