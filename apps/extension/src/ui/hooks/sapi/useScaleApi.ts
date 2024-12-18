import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"
import { getMetadataRpcFromDef } from "extension-shared"
import { useMemo } from "react"

import { api } from "@ui/api"
import { useChain, useChainByGenesisHash, useToken } from "@ui/state"
import { getScaleApi, ScaleApi } from "@ui/util/scaleApi"

/**
 * useScaleApi instantiates a ScaleApi object for a given chainIdOrHash, specVersion, and blockHash.
 * Calling this hook will download the metadata for the given chainIdOrHash, which can cause performance issues.
 * It is recommended to use this hook only when necessary and not in a loop where it may be called many times for many chains.
 */
export const useScaleApi = (
  chainIdOrHash: ChainId | HexString | null | undefined,
  specVersion?: number,
  blockHash?: HexString,
) => {
  const chainById = useChain(chainIdOrHash)
  const chainByGenesisHash = useChainByGenesisHash(chainIdOrHash)
  const chain = useMemo(() => chainById || chainByGenesisHash, [chainById, chainByGenesisHash])
  const token = useToken(chain?.nativeToken?.id)

  return useQuery({
    queryKey: ["useScaleApi", chain, specVersion, blockHash, token],
    queryFn: async () => {
      if (!chain?.genesisHash || !token) return null

      const metadataDef = await api.subChainMetadata(chain.genesisHash, specVersion, blockHash)
      assert(metadataDef?.metadataRpc, `Metadata unavailable for chain ${chain.id}`)

      const metadataRpc = getMetadataRpcFromDef(metadataDef)
      if (!metadataRpc) return null

      return getScaleApi(
        chain.id,
        metadataRpc,
        token,
        chain.hasCheckMetadataHash,
        chain.signedExtensions,
        chain.registryTypes,
      ) as ScaleApi
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
