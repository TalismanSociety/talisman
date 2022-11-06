import {
  AccountJson,
  AccountJsonHardwareEthereum,
  AccountJsonHardwareSubstrate,
} from "@core/domains/accounts/types"
import { RequestIdOnly } from "@core/types/base"
import type { TransactionRequest as EthTransactionRequest } from "@ethersproject/abstract-provider"
import {
  SigningRequest as PolkadotSigningRequest,
  RequestSigningApproveSignature,
  RequestSigningSubscribe,
} from "@polkadot/extension-base/background/types"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { BigNumber, BigNumberish } from "ethers"

export type { SignerPayloadJSON, SignerPayloadRaw } // Make this available elsewhere also

export type {
  RequestSign,
  RequestSigningApprovePassword,
  RequestSigningCancel,
  RequestSigningIsLocked,
  ResponseSigningIsLocked,
  ResponseSigning,
} from "@polkadot/extension-base/background/types"

export type { RequestSigningApproveSignature }

export interface SigningRequest extends PolkadotSigningRequest {
  request: PolkadotSigningRequest["request"]
  account: AccountJson | AccountJsonHardwareSubstrate
}

export interface EthBaseSignRequest extends Omit<SigningRequest, "request" | "account"> {
  ethChainId: number
  account: AccountJson | AccountJsonHardwareEthereum
  type: "ethereum"
  method:
    | "personal_sign"
    | "eth_sendTransaction"
    | "eth_signTypedData"
    | "eth_signTypedData_v1"
    | "eth_signTypedData_v3"
    | "eth_signTypedData_v4"
  request: any
}

export interface EthSignRequest extends EthBaseSignRequest {
  request: string
  method:
    | "personal_sign"
    | "eth_signTypedData"
    | "eth_signTypedData_v1"
    | "eth_signTypedData_v3"
    | "eth_signTypedData_v4"
}

export interface EthSignAndSendRequest extends EthBaseSignRequest {
  request: EthTransactionRequest
  method: "eth_sendTransaction"
}

export type AnyEthSigningRequest = EthSignAndSendRequest | EthSignRequest
export type AnySigningRequest = SigningRequest | AnyEthSigningRequest

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

export type EthPriorityOptionName = "low" | "medium" | "high"
export type EthPriorityOptions = Record<EthPriorityOptionName, BigNumber>

export type EthTransactionDetails = {
  estimatedGas: BigNumberish
  gasPrice: BigNumberish
  estimatedFee: BigNumberish
  maxFee: BigNumberish
  baseFeePerGas?: BigNumberish
  gasUsedRatio?: number
  priorityOptions?: EthPriorityOptions
}

export interface SigningMessages {
  // signing message signatures
  "pri(signing.approveSign)": [RequestIdOnly, boolean]
  "pri(signing.approveSign.hardware)": [RequestSigningApproveSignature, boolean]
  "pri(signing.details)": [RequestIdOnly, TransactionDetails | null]
  "pri(signing.requests)": [RequestSigningSubscribe, boolean, AnySigningRequest[]]
  "pri(signing.byid.subscribe)": [RequestIdOnly, boolean, AnySigningRequest]
}
