import type { MetadataDef as PjsMetadataDef } from "@polkadot/extension-inject/types"
import { HexString } from "@polkadot/util/types"
import { ChainId } from "@talismn/chaindata-provider"

export interface TalismanMetadataDef extends PjsMetadataDef {
  metadataRpc?: string
}

type SubstrateRequestSend = {
  chainId: ChainId
  method: string
  params: unknown[]
  isCacheable?: boolean
}

type SubstrateRequestChainMetadata = {
  genesisHash: HexString
  specVersion?: number
  blockHash?: HexString
}

export type SubstrateMessages = {
  "pri(substrate.rpc.send)": [SubstrateRequestSend, unknown]
  "pri(substrate.metadata.get)": [SubstrateRequestChainMetadata, TalismanMetadataDef | undefined]
}
