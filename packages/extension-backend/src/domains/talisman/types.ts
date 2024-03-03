import type { JsonRpcResponse } from "@polkadot/rpc-provider/types"
import { HexString } from "@polkadot/util/types"
import type { CustomChain, CustomEvmNetwork, Token } from "@talismn/chaindata-provider"

// to account for new requirement for generic arg in this type https://github.com/polkadot-js/api/commit/f4c2b150d3d69d43c56699613666b96dd0a763f4#diff-f87c17bc7fae027ec6d43bac5fc089614d9fa097f466aa2be333b44cee81f0fd
// TODO incrementally replace 'unknown' with proper types where possible
export type UnknownJsonRpcResponse<T = unknown> = JsonRpcResponse<T>

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
    { error: Error | null; data: unknown }
  ]
  "pub(talisman.rpc.byGenesisHash.unsubscribe)": [RequestRpcByGenesisHashUnsubscribe, boolean]
  "pub(talisman.customSubstrateChains.subscribe)": [null, string, CustomChain[]]
  "pub(talisman.customSubstrateChains.unsubscribe)": [string, boolean]
  "pub(talisman.customEvmNetworks.subscribe)": [null, string, CustomEvmNetwork[]]
  "pub(talisman.customEvmNetworks.unsubscribe)": [string, boolean]
  "pub(talisman.customTokens.subscribe)": [null, string, Token[]]
  "pub(talisman.customTokens.unsubscribe)": [string, boolean]
}
