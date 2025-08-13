import {
  IChainConnectorDot,
  IChainConnectorEth,
  IChainConnectorSol,
} from "@talismn/chain-connectors"

export type ChainConnectors = {
  substrate?: IChainConnectorDot
  evm?: IChainConnectorEth
  solana?: IChainConnectorSol
}
