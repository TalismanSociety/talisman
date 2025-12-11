import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { DotNetworkId } from "@talismn/chaindata-provider"
import { getScaleApi, ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { getMetadataRpcFromDef } from "extension-core"

import { api } from "@ui/api"
import { useDotNetwork, useToken } from "@ui/state"

/**
 * useScaleApi instantiates a ScaleApi object for a given chainIdOrHash, specVersion, and blockHash.
 * Calling this hook will download the metadata for the given chainIdOrHash, which can cause performance issues.
 * It is recommended to use this hook only when necessary and not in a loop where it may be called many times for many chains.
 */
export const useScaleApi = (
  chainIdOrHash: DotNetworkId | HexString | null | undefined,
  specVersion?: number,
) => {
  const chain = useDotNetwork(chainIdOrHash)
  const token = useToken(chain?.nativeTokenId)

  return useQuery({
    queryKey: ["useScaleApi", chain, specVersion, token],
    queryFn: async () => {
      if (!chain?.genesisHash || !token) return null

      const metadataDef = await api.subChainMetadata(chain.genesisHash, specVersion)
      assert(metadataDef?.metadataRpc, `Failed to fetch metadata`)

      const metadataRpc = getMetadataRpcFromDef(metadataDef)
      if (!metadataRpc) return null

      return getScaleApi(
        {
          chainId: chain.id,
          send: (...args) => api.subSend(chain.id, ...args),
          submit: api.subSubmit,
          submitWithBittensorMevShield: api.subSubmitWithBittensorMevShield,
        },
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
