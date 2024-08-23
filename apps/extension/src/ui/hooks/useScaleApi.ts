import { assert } from "@polkadot/util"
import { HexString } from "@polkadot/util/types"
import { decodeMetadata } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { ChainId } from "extension-core"
import { useMemo } from "react"

import { api } from "@ui/api"
import { getScaleApi, ScaleApi } from "@ui/util/scaleApi"

import useChain from "./useChain"
import { useChainByGenesisHash } from "./useChainByGenesisHash"

export const useScaleApi = (
  chainIdOrHash: ChainId | HexString | null | undefined,
  specVersion?: number,
  blockHash?: HexString
) => {
  const maybeChain1 = useChain(chainIdOrHash)
  const maybeChain2 = useChainByGenesisHash(chainIdOrHash)
  const chain = useMemo(() => maybeChain1 || maybeChain2, [maybeChain1, maybeChain2])

  return useQuery({
    queryKey: ["useScaleApi", chain, specVersion, blockHash],
    queryFn: async () => {
      if (!chain?.genesisHash) return null

      const metadataDef = await api.subChainMetadata(chain.genesisHash, specVersion, blockHash)
      assert(metadataDef?.metadataRpc, `Metadata unavailable for chain ${chain.id}`)

      const hexMetadata = Buffer.from(metadataDef.metadataRpc, "base64").toString("hex")
      const metadata = decodeMetadata(hexMetadata)
      assert(metadata.metadata, `Metadata V14+ unavailable for chain ${chain.id}`)

      return getScaleApi(chain.id, metadata.metadata) as ScaleApi
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchIntervalInBackground: false,
  })
}
