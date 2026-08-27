import { chainConnector } from "./chain-connector"
import { chainConnectorBtc } from "./chain-connector-btc"
import { chainConnectorEvm } from "./chain-connector-evm"
import { chainConnectorSol } from "./chain-connector-sol"

export const chainConnectors = {
  substrate: chainConnector,
  evm: chainConnectorEvm,
  solana: chainConnectorSol,
  bitcoin: chainConnectorBtc,
}
