import { Network, Token } from "@talismn/chaindata-provider"

import { RequestIdOnly } from "../../types/base"

export type {
  Network,
  NetworkId,
  NetworkList,
  DotNetwork,
  EthNetwork,
  DotNetworkId,
  DotNetworkList,
  EthNetworkId,
  EthNetworkList,
} from "@talismn/chaindata-provider"

export interface ChaindataMessages {
  "pri(chaindata.networks.subscribe)": [null, boolean, Array<Network>]
  "pri(chaindata.networks.add)": [Network, boolean]
  "pri(chaindata.networks.remove)": [RequestIdOnly, boolean]

  "pri(chaindata.tokens.subscribe)": [null, boolean, Array<Token>]
  "pri(chaindata.tokens.add)": [Token, boolean]
  "pri(chaindata.tokens.remove)": [RequestIdOnly, boolean]
}
