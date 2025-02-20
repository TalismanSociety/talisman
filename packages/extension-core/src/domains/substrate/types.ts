import type { HexString } from "@polkadot/util/types"
import type { ChainId } from "@talismn/chaindata-provider"
import type { TalismanMetadataDef } from "extension-shared"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"

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

type SubstrateRequestSubmit = {
  payload: SignerPayloadJSON
  signature?: HexString
}

type SubstrateResponseSubmit = {
  hash: HexString
}

export type SubstrateMessages = {
  "pri(substrate.rpc.send)": [SubstrateRequestSend, unknown]
  "pri(substrate.rpc.submit)": [SubstrateRequestSubmit, SubstrateResponseSubmit]
  "pri(substrate.metadata.get)": [SubstrateRequestChainMetadata, TalismanMetadataDef | undefined]
}
