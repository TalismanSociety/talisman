import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { ChainConnectorSol } from "@talismn/chain-connector-sol"

export type ChainConnectors = {
  substrate?: ChainConnector
  evm?: ChainConnectorEvm
  solana?: ChainConnectorSol
}
