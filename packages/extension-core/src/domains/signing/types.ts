import {
  RequestSigningApproveSignature as PolkadotRequestSigningApproveSignature,
  RequestSign,
} from "@polkadot/extension-base/background/types"
import type { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from "@polkadot/types/types"
import { RpcTransactionRequest } from "viem"

import { BaseRequest, BaseRequestId } from "../../types/base"
import { AccountJsonAny } from "../accounts/types"
import { EthGasSettingsEip1559, EthGasSettingsLegacy, EvmNetworkId } from "../ethereum/types"

export type { SignerPayloadJSON, SignerPayloadRaw } // Make this available elsewhere also

export type {
  RequestSign,
  RequestSigningApprovePassword,
  RequestSigningCancel,
  RequestSigningIsLocked,
  ResponseSigningIsLocked,
} from "@polkadot/extension-base/background/types"

export type SigningRequestID<T extends keyof SigningRequests> = BaseRequestId<T>
export type AnySigningRequestID = `${keyof SigningRequests}.${string}`

export type AnySigningRequestIdOnly = {
  id: AnySigningRequestID
}

export type KnownSigningRequestIdOnly<T extends keyof SigningRequests> = {
  id: SigningRequestID<T>
}

export type KnownSigningRequestApprove<T extends keyof SigningRequests> = {
  id: SigningRequestID<T>
  payload?: SignerPayloadJSON
}

export type RequestSigningApproveSignature = Omit<PolkadotRequestSigningApproveSignature, "id"> & {
  id: SigningRequestID<SUBSTRATE_SIGN>
  payload?: SignerPayloadJSON
}

interface BaseSigningRequest<T extends keyof SigningRequests> extends BaseRequest<T> {
  id: SigningRequestID<T>
  url: string
}

type SUBSTRATE_SIGN = "substrate-sign"
const SUBSTRATE_SIGN: SUBSTRATE_SIGN = "substrate-sign"

export interface SubstrateSigningRequest extends BaseSigningRequest<SUBSTRATE_SIGN> {
  request: RequestSign
  account: AccountJsonAny
}

export type SubstrateSignResponse = Omit<SignerResult, "id"> & { id: string }

export interface EthBaseSignRequest<T extends ETH_SIGN | ETH_SEND> extends BaseSigningRequest<T> {
  ethChainId: EvmNetworkId
  account: AccountJsonAny
  request: string | RpcTransactionRequest
}

export type ETH_SIGN = "eth-sign"
export type ETH_SEND = "eth-send"

const ETH_SIGN: ETH_SIGN = "eth-sign"
const ETH_SEND: ETH_SEND = "eth-send"

export const SIGNING_TYPES = {
  ETH_SIGN,
  ETH_SEND,
  SUBSTRATE_SIGN,
}

export type EthSignMessageMethod =
  | "personal_sign"
  | "eth_signTypedData"
  | "eth_signTypedData_v1"
  | "eth_signTypedData_v3"
  | "eth_signTypedData_v4"

export interface EthSignRequest extends EthBaseSignRequest<ETH_SIGN> {
  request: string
  ethChainId: EvmNetworkId
  method: EthSignMessageMethod
}

export interface EthSignAndSendRequest extends EthBaseSignRequest<ETH_SEND> {
  request: RpcTransactionRequest
  ethChainId: EvmNetworkId
  method: "eth_sendTransaction"
}

export type AnyEthSigningRequest = EthSignAndSendRequest | EthSignRequest
export type AnySigningRequest = SubstrateSigningRequest | AnyEthSigningRequest

export type SigningRequests = {
  "eth-sign": [EthSignRequest, string]
  "eth-send": [EthSignAndSendRequest, string]
  "substrate-sign": [SubstrateSigningRequest, SubstrateSignResponse]
}

export type EthResponseSign = string

export type TransactionMethod = {
  section: string
  method: string
  docs: string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
}

export type TransactionPayload = {
  blockHash: string
  era: {
    MortalEra?: {
      period: string
      phase: string
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ImmortalEra?: any
  }
  genesisHash: string
  method: string
  nonce: string
  specVersion: string
  tip: string
  transactionVersion?: string
}

export type TransactionDetails = {
  payload?: TransactionPayload
  method?: TransactionMethod
  partialFee?: string
}

export type SignerPayloadGenesisHash = SignerPayloadJSON["genesisHash"] // extracting this out because it's liable to change to HexString in future

// eth fees types ----------------------------------
export type EthPriorityOptionNameEip1559 = "low" | "medium" | "high" | "custom"
export type EthPriorityOptionNameLegacy = "recommended" | "custom"
export type EthPriorityOptionName = EthPriorityOptionNameEip1559 | EthPriorityOptionNameLegacy

export type GasSettingsByPriorityEip1559 = { type: "eip1559" } & Record<
  EthPriorityOptionNameEip1559,
  EthGasSettingsEip1559
>
export type GasSettingsByPriorityLegacy = { type: "legacy" } & Record<
  EthPriorityOptionNameLegacy,
  EthGasSettingsLegacy
>
export type GasSettingsByPriority = GasSettingsByPriorityEip1559 | GasSettingsByPriorityLegacy

export type EthBaseFeeTrend = "idle" | "decreasing" | "increasing" | "toTheMoon"

export type EthTransactionDetails = {
  evmNetworkId: EvmNetworkId
  estimatedGas: bigint
  gasPrice: bigint
  estimatedFee: bigint
  estimatedL1DataFee: bigint | null
  maxFee: bigint
  baseFeePerGas?: bigint | null
  baseFeeTrend?: EthBaseFeeTrend
}

export interface SigningMessages {
  // signing message signatures
  "pri(signing.approveSign)": [KnownSigningRequestApprove<"substrate-sign">, boolean]
  "pri(signing.approveSign.hardware)": [RequestSigningApproveSignature, boolean]
  "pri(signing.approveSign.qr)": [RequestSigningApproveSignature, boolean]
  "pri(signing.approveSign.signet)": [KnownSigningRequestIdOnly<"substrate-sign">, boolean]
  "pri(signing.cancel)": [KnownSigningRequestIdOnly<"substrate-sign">, boolean]
}
