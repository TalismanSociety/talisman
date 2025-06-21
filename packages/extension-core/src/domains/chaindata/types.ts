import { Network, Token } from "@talismn/chaindata-provider"

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
  "pri(chaindata.tokens.subscribe)": [null, boolean, Array<Token>]
}
