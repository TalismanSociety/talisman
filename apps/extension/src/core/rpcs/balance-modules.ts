import { chainConnectorBtc } from "./chain-connector-btc"
import { chainConnectorDot } from "./chain-connector-dot"
import { chainConnectorEvm } from "./chain-connector-evm"
import { chainConnectorSol } from "./chain-connector-sol"

export const chainConnectors = {
  substrate: chainConnectorDot,
  evm: chainConnectorEvm,
  solana: chainConnectorSol,
  bitcoin: chainConnectorBtc,
}
