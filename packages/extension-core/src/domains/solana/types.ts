import { SolNetworkId } from "@talismn/chaindata-provider"

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

export type RequestSolanaRpcSend = {
  networkId: SolNetworkId
  request: SolRpcRequest
}

export type SolanaMessages = {
  "pri(solana.rpc.send)": [RequestSolanaRpcSend, SolRpcResponse]
}
