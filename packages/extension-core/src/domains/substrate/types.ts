import type { HexString } from "@polkadot/util/types"
import type { ChainId } from "@talismn/chaindata-provider"
import type { TalismanMetadataDef } from "extension-shared"

export type { TalismanMetadataDef } from "extension-shared"

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
