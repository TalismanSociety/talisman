import type { MetadataDef as PjsMetadataDef } from "@polkadot/extension-inject/types"
import type { HexString } from "@polkadot/util/types"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { SignerPayloadJSON } from "@substrate/txwrapper-core"

import { WalletTransactionInfo } from "../transactions"

export interface TalismanMetadataDef extends PjsMetadataDef {
  metadataRpc?: `0x${string}`
}

type SubstrateRequestSend = {
  chainId: DotNetworkId
  method: string
  params: unknown[]
  isCacheable?: boolean
}

type SubstrateRequestChainMetadata = {
  genesisHash: HexString
  specVersion?: number
}

type SubstrateRequestSubmit = {
  payload: SignerPayloadJSON
  signature?: HexString
  txInfo?: WalletTransactionInfo
}

type SubstrateResponseSubmit = {
  hash: HexString
}

type SubstrateRequestSubmitBittensorMevShield = {
  payload: SignerPayloadJSON
  // doesnt support hardware wallet, enforce it by not having signature here
  txInfo?: WalletTransactionInfo
}

export type SubstrateMessages = {
  "pri(substrate.rpc.send)": [SubstrateRequestSend, unknown]
  "pri(substrate.rpc.submit)": [SubstrateRequestSubmit, SubstrateResponseSubmit]
  "pri(substrate.rpc.submit.withBittensorMevShield)": [
    SubstrateRequestSubmitBittensorMevShield,
    SubstrateResponseSubmit,
  ]
  "pri(substrate.metadata.get)": [SubstrateRequestChainMetadata, TalismanMetadataDef | undefined]
}
