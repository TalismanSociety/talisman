import type { JsonRpcResponse } from "@polkadot/rpc-provider/types"

// to account for new requirement for generic arg in this type https://github.com/polkadot-js/api/commit/f4c2b150d3d69d43c56699613666b96dd0a763f4#diff-f87c17bc7fae027ec6d43bac5fc089614d9fa097f466aa2be333b44cee81f0fd
// TODO incrementally replace 'unknown' with proper types where possible
export type UnknownJsonRpcResponse<T = unknown> = JsonRpcResponse<T>

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
  "pub(rpc.talisman.byGenesisHash.send)": [RequestRpcByGenesisHashSend, UnknownJsonRpcResponse]
  "pub(rpc.talisman.byGenesisHash.subscribe)": [
    RequestRpcByGenesisHashSubscribe,
    string,
    { error: Error | null; data: unknown }
  ]
  "pub(rpc.talisman.byGenesisHash.unsubscribe)": [RequestRpcByGenesisHashUnsubscribe, boolean]
}
