import type { SolNetworkId } from "@talismn/chaindata-provider"

// import { SolTransactionJson } from "@talismn/solana"

import type { SigningRequestID } from "../signing/types"
import type { WalletTransactionInfo } from "../transactions"

export type SolRpcRequest = {
  id: string
  method: string
  params: unknown[]
}

export type ResponseSolanaRpcSend = {
  /**
   * Raw JSON text of the node's JSON-RPC response envelope.
   * Kept as text because kit RPC responses contain lossless bigints, which
   * cannot cross the extension messaging boundary (ports JSON-serialize).
   * Parse with `parseJsonWithBigInts` from `@solana/rpc-spec-types`.
   */
  rawJson: string
}

export type RequestSolanaRpcSend = {
  networkId: SolNetworkId
  request: SolRpcRequest
}

export type RequestSolanaSubmit = {
  networkId: SolNetworkId
  transaction: string
  txInfo?: WalletTransactionInfo
}

export type ResponseSolanaSubmit = {
  // there are no "transaction hashes" on solana, transactions are identified by their signatures (base58 encoding)
  signature: string
}

export type SolanaSignApproveResponse =
  | {
      type: "transaction"
      transaction?: string // supplied if signed with hardware device from frontend
      networkId?: SolNetworkId
    }
  | {
      type: "message"
      signature?: string // base58 encoded, supplied if signed with hardware device from frontend
    }

// this message works for all sign requests (msg sign, tx sign, tx sign & send)
export type RequestSolanaSignApprove = {
  id: SigningRequestID<"sol-sign">
} & SolanaSignApproveResponse

export type SolanaExtensionMessages = {
  "pri(solana.rpc.send)": [RequestSolanaRpcSend, ResponseSolanaRpcSend]
  "pri(solana.rpc.submit)": [RequestSolanaSubmit, ResponseSolanaSubmit]
  // biome-ignore lint/suspicious/noConfusingVoidType: legacy
  "pri(solana.sign.approve)": [RequestSolanaSignApprove, void]
}
