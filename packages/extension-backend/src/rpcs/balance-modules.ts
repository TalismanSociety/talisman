import { defaultBalanceModules } from "@talismn/balances"

import { chainConnector } from "../rpcs/chain-connector"
import { chainConnectorEvm } from "../rpcs/chain-connector-evm"
import { chaindataProvider } from "../rpcs/chaindata"

export const chainConnectors = { substrate: chainConnector, evm: chainConnectorEvm }
export const balanceModules = defaultBalanceModules.map((mod) =>
  mod({ chainConnectors, chaindataProvider })
)
