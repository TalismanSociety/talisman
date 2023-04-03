import type { JsonRpcResponse } from "@polkadot/rpc-provider/types"

export type RequestRpcByGenesisHashSend = {
  genesisHash: string
  method: string
  params: unknown[]
}

export type RequestRpcByGenesisHashSubscribe = {
  genesisHash: string
  subscribeMethod: string
  responseMethod: string
  params: unknown[]
  timeout: number | false
}

export type RequestRpcByGenesisHashUnsubscribe = {
  subscriptionId: string
  unsubscribeMethod: string
}

export interface RpcMessages {
  // chain message signatures
  "pub(rpc.talisman.byGenesisHash.send)": [RequestRpcByGenesisHashSend, JsonRpcResponse]
  "pub(rpc.talisman.byGenesisHash.subscribe)": [
    RequestRpcByGenesisHashSubscribe,
    string,
    { error: Error | null; data: unknown }
  ]
  "pub(rpc.talisman.byGenesisHash.unsubscribe)": [RequestRpcByGenesisHashUnsubscribe, boolean]
}
