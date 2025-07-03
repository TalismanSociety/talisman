import {
  NativeToken,
  Network,
  NetworkOfPlatform,
  NetworkPlatform,
  Token,
} from "@talismn/chaindata-provider"

import { RequestIdOnly } from "../../types/base"

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
}
