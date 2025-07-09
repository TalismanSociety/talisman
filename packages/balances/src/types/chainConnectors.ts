import { ChainConnector } from "@talismn/chain-connector"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"

export type ChainConnectors = { substrate?: ChainConnector; evm?: ChainConnectorEvm }
