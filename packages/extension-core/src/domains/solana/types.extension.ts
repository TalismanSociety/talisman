import { SolNetworkId } from "@talismn/chaindata-provider"
import { SolTransactionJson } from "@talismn/solana"

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
  lastValidBlockHeight?: number // if tx is signed (ledger), we need the corresponding last valid block height
  txInfo?: WalletTransactionInfo
}

export type ResponseSolanaSubmit = {
  // there are no "transaction hashes" on solana, transactions are identified by their signatures (base58 encoding)
  signature: string
}

export type SolanaExtensionMessages = {
  "pri(solana.rpc.send)": [RequestSolanaRpcSend, ResponseSolanaRpcSend]
  "pri(solana.rpc.submit)": [RequestSolanaSubmit, ResponseSolanaSubmit]
}
