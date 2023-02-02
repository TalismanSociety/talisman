import {
  AccountJson,
  AccountJsonHardwareEthereum,
  AccountJsonHardwareSubstrate,
} from "@core/domains/accounts/types"
import {
  EthGasSettingsEip1559,
  EthGasSettingsLegacy,
  EvmNetworkId,
} from "@core/domains/ethereum/types"
import { BaseRequest } from "@core/types/base"
import type { TransactionRequest as EthTransactionRequest } from "@ethersproject/abstract-provider"
import {
  RequestSigningApproveSignature as PolkadotRequestSigningApproveSignature,
  RequestSign,
  RequestSigningSubscribe,
  ResponseSigning,
} from "@polkadot/extension-base/background/types"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { BigNumberish } from "ethers"

export type { ResponseSigning, SignerPayloadJSON, SignerPayloadRaw } // Make this available elsewhere also

export type {
  RequestSign,
  RequestSigningApprovePassword,
  RequestSigningCancel,
  RequestSigningIsLocked,
  ResponseSigningIsLocked,
} from "@polkadot/extension-base/background/types"

export type RequestID<T extends keyof SigningRequests> = `${T}.${string}`
export type AnyRequestID = `${keyof SigningRequests}.${string}`

export type AnySigningRequestIdOnly = {
  id: AnyRequestID
}

export type KnownSigningRequestIdOnly<T extends keyof SigningRequests> = {
  id: RequestID<T>
}

export type RequestSigningApproveSignature = Omit<PolkadotRequestSigningApproveSignature, "id"> & {
  id: RequestID<SUBSTRATE_SIGN>
}

interface BaseSigningRequest<T extends keyof SigningRequests> extends BaseRequest<T> {
  id: RequestID<T>
  url: string
}

type SUBSTRATE_SIGN = "substrate-sign"
const SUBSTRATE_SIGN: SUBSTRATE_SIGN = "substrate-sign"

export interface SubstrateSigningRequest extends BaseSigningRequest<SUBSTRATE_SIGN> {
  request: RequestSign
  account: AccountJson | AccountJsonHardwareSubstrate
}

export interface EthBaseSignRequest<T extends ETH_SIGN | ETH_SEND> extends BaseSigningRequest<T> {
  ethChainId: EvmNetworkId
  account: AccountJson | AccountJsonHardwareEthereum
  request: string | EthTransactionRequest
}

type ETH_SIGN = "eth-sign"
type ETH_SEND = "eth-send"

const ETH_SIGN: ETH_SIGN = "eth-sign"
const ETH_SEND: ETH_SEND = "eth-send"

export const SIGNING_TYPES = {
  ETH_SIGN,
  ETH_SEND,
  SUBSTRATE_SIGN,
}
export interface EthSignRequest extends EthBaseSignRequest<ETH_SIGN> {
  request: string
  ethChainId: EvmNetworkId
  method:
    | "personal_sign"
    | "eth_signTypedData"
    | "eth_signTypedData_v1"
    | "eth_signTypedData_v3"
    | "eth_signTypedData_v4"
}

export interface EthSignAndSendRequest extends EthBaseSignRequest<ETH_SEND> {
  request: EthTransactionRequest
  ethChainId: EvmNetworkId
  method: "eth_sendTransaction"
}

export type AnyEthSigningRequest = EthSignAndSendRequest | EthSignRequest
export type AnySigningRequest = SubstrateSigningRequest | AnyEthSigningRequest

export type SigningRequests = {
  "eth-sign": [EthSignRequest, string]
  "eth-send": [EthSignAndSendRequest, string]
  "substrate-sign": [SubstrateSigningRequest, ResponseSigning]
}

export type EthResponseSign = string

export type TransactionMethod = {
  section: string
  method: string
  docs: string[]
  args: any
}

export type TransactionPayload = {
  blockHash: string
  era: {
    MortalEra?: {
      period: string
      phase: string
    }
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
  estimatedGas: BigNumberish
  gasPrice: BigNumberish
  estimatedFee: BigNumberish
  maxFee: BigNumberish // TODO yeet !
  baseFeePerGas?: BigNumberish | null
  baseFeeTrend?: EthBaseFeeTrend
}

export interface SigningMessages {
  // signing message signatures
  "pri(signing.approveSign)": [KnownSigningRequestIdOnly<"substrate-sign">, boolean]
  "pri(signing.approveSign.hardware)": [RequestSigningApproveSignature, boolean]
  "pri(signing.details)": [KnownSigningRequestIdOnly<"substrate-sign">, TransactionDetails]
  "pri(signing.requests)": [RequestSigningSubscribe, boolean, AnySigningRequest[]]
  "pri(signing.cancel)": [KnownSigningRequestIdOnly<"substrate-sign">, boolean]
  "pri(signing.byid.subscribe)": [AnySigningRequestIdOnly, boolean, AnySigningRequest]
}
