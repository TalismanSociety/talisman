import type { DotNetworkId } from "@talismn/chaindata-provider"
import type { HexString } from "@talismn/util"
import type { MetadataDef as PjsMetadataDef, SignerPayloadJSON } from "../../types/pjsInterop"
import type { WalletTransactionInfo } from "../transactions/types"

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

type SubstrateResponseSubmitBittensorMevShield = {
  hash: HexString
  innerHash?: HexString
}

type SubstrateRequestSubmitBittensorMevShield = {
  payload: SignerPayloadJSON
  txInfo?: WalletTransactionInfo
}

export type MevShieldWindow = {
  headNumber: number
  deadline: number
}

export type MevShieldRequestPrepare = {
  payload: SignerPayloadJSON
  innerSignature: HexString
}

export type MevShieldResponsePrepare =
  | { status: "ready"; outerPayload: SignerPayloadJSON; shieldWindow: MevShieldWindow }
  | { status: "unavailable" }
  | { status: "expired" }

export type MevShieldRequestSubmit = {
  payload: SignerPayloadJSON
  innerSignature: HexString
  outerPayload: SignerPayloadJSON
  outerSignature: HexString
  shieldWindow: MevShieldWindow
  txInfo?: WalletTransactionInfo
}

export type MevShieldResponseSubmit =
  | { status: "submitted"; hash: HexString; innerHash: HexString }
  | { status: "missed" }

export type SubstrateMessages = {
  "pri(substrate.rpc.send)": [SubstrateRequestSend, unknown]
  "pri(substrate.rpc.submit)": [SubstrateRequestSubmit, SubstrateResponseSubmit]
  "pri(substrate.rpc.submit.withBittensorMevShield)": [
    SubstrateRequestSubmitBittensorMevShield,
    SubstrateResponseSubmitBittensorMevShield,
  ]
  "pri(substrate.mevShield.prepare)": [MevShieldRequestPrepare, MevShieldResponsePrepare]
  "pri(substrate.mevShield.submit)": [MevShieldRequestSubmit, MevShieldResponseSubmit]
  "pri(substrate.metadata.get)": [SubstrateRequestChainMetadata, TalismanMetadataDef | undefined]
}
