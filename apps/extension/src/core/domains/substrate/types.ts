import { MetadataDef } from "@core/inject/types"
import { HexString } from "@polkadot/util/types"
import { ChainId } from "@talismn/chaindata-provider"

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
  "pri(substrate.metadata.get)": [SubstrateRequestChainMetadata, MetadataDef | undefined]
}
