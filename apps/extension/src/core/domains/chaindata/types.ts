import type {
  NativeToken,
  Network,
  NetworkId,
  NetworkOfPlatform,
  NetworkPlatform,
  Token,
  TokenId,
} from "@talismn/chaindata-provider"

import type { RequestIdOnly } from "../../types/base"

/** a stake on a subnet with one validator: the position a dTAO token with a hotkey stands for */
export type RequestRegisterDTaoPosition = { networkId: NetworkId; netuid: number; hotkey: string }

export type RequestNetworkUpsert<
  P extends NetworkPlatform = NetworkPlatform,
  N = NetworkOfPlatform<P>,
  T = NativeToken<P>,
> = { platform: P; network: N; nativeToken: T }

export interface ChaindataMessages {
  "pri(chaindata.networks.subscribe)": [null, boolean, Array<Network>]
  "pri(chaindata.networks.upsert)": [RequestNetworkUpsert, boolean]
  "pri(chaindata.networks.remove)": [RequestIdOnly, boolean]

  "pri(chaindata.tokens.subscribe)": [null, boolean, Array<Token>]
  "pri(chaindata.tokens.upsert)": [Token, boolean]
  "pri(chaindata.tokens.remove)": [RequestIdOnly, boolean]
  "pri(chaindata.tokens.registerDTaoPosition)": [RequestRegisterDTaoPosition, TokenId]
}
