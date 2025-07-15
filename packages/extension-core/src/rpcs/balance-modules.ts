import { chainConnector } from "./chain-connector"
import { chainConnectorEvm } from "./chain-connector-evm"

export const chainConnectors = { substrate: chainConnector, evm: chainConnectorEvm }
