import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { decodeMetadata } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"
import { useMemo } from "react"

import { api } from "@ui/api"
import { useChain, useChainByGenesisHash, useToken } from "@ui/state"
import { getScaleApi, ScaleApi } from "@ui/util/scaleApi"

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

      const hexMetadata = Buffer.from(metadataDef.metadataRpc, "base64").toString("hex")
      const metadata = decodeMetadata(hexMetadata)
      assert(metadata.metadata, `Metadata V14+ unavailable for chain ${chain.id}`)

      return getScaleApi(
        chain.id,
        metadata.metadata,
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
