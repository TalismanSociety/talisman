import type { HexString } from "@talismn/util"

// structural equivalent of the legacy polkadot-js JsonRpcResponse type
// TODO incrementally replace 'unknown' with proper types where possible
export type UnknownJsonRpcResponse<T = unknown> = {
  jsonrpc: "2.0"
  id: number | string
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

export type RequestRpcByGenesisHashSend = {
  genesisHash: HexString
  method: string
  params: unknown[]
}

export type RequestRpcByGenesisHashSubscribe = {
  genesisHash: HexString
  subscribeMethod: string
  responseMethod: string
  params: unknown[]
  timeout: number | false
}

export type RequestRpcByGenesisHashUnsubscribe = {
  subscriptionId: string
  unsubscribeMethod: string
}

export interface TalismanMessages {
  // chain message signatures
  "pub(talisman.rpc.byGenesisHash.send)": [RequestRpcByGenesisHashSend, UnknownJsonRpcResponse]
  "pub(talisman.rpc.byGenesisHash.subscribe)": [
    RequestRpcByGenesisHashSubscribe,
    string,
    { error: Error | null; data: unknown },
  ]
  "pub(talisman.rpc.byGenesisHash.unsubscribe)": [RequestRpcByGenesisHashUnsubscribe, boolean]
  "pub(talisman.extension.openPortfolio)": [null, boolean]
}
