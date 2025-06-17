import { Network } from "@talismn/chaindata-provider"

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

export interface NetworksMessages {
  "pri(networks.subscribe)": [null, boolean, Array<Network>]
}
