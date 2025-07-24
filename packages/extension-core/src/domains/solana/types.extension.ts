import { SolNetworkId } from "@talismn/chaindata-provider"
import { SolTransactionJson } from "@talismn/solana"

import { SigningRequestID } from "../signing/types"
import { WalletTransactionInfo } from "../transactions"

export type SolRpcRequest = {
  id: string
  method: string
  params: unknown[]
}

export type SolRpcResponse<T = unknown> = {
  id: string
  jsonrpc: "2.0"
  result: T
}

export type ResponseSolanaRpcSend = SolRpcResponse

export type RequestSolanaRpcSend = {
  networkId: SolNetworkId
  request: SolRpcRequest
}

export type RequestSolanaSubmit = {
  networkId: SolNetworkId
  transaction: SolTransactionJson
  txInfo?: WalletTransactionInfo
}

export type ResponseSolanaSubmit = {
  // there are no "transaction hashes" on solana, transactions are identified by their signatures (base58 encoding)
  signature: string
}

// this message works for all sign requests (msg sign, tx sign, tx sign & send)
export type RequestSolanaSignApprove = {
  id: SigningRequestID<"sol-sign">
  signature?: string // supplied if signed with hardware device from frontend
}

export type SolanaExtensionMessages = {
  "pri(solana.rpc.send)": [RequestSolanaRpcSend, ResponseSolanaRpcSend]
  "pri(solana.rpc.submit)": [RequestSolanaSubmit, ResponseSolanaSubmit]
  "pri(solana.sign.approve)": [RequestSolanaSignApprove, void]
}
