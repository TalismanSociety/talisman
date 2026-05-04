import { getProxyTypes, type ProxyTypeInfo } from "@core/domains/accountProxies/getProxyTypes"
import { getMetadataRpcFromDef } from "@core/domains/metadata/helpers"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useDotNetwork } from "@ui/state/chaindata"

const EMPTY: ProxyTypeInfo[] = []

/**
 * Returns the `ProxyType` enum variants (name + docs) for a given network,
 * extracted from that network's runtime metadata.
 *
 * Returns an empty array while loading, on error, or when the network has no
 * recognisable Proxy pallet.
 */
export const useProxyTypesForNetwork = (
  networkId: DotNetworkId | null | undefined
): ProxyTypeInfo[] => {
  const chain = useDotNetwork(networkId)

  const { data } = useQuery({
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

  return data ?? EMPTY
}
