import { defaultBalanceModules } from "@talismn/balances"

import { chainConnector } from "./chain-connector"
import { chainConnectorEvm } from "./chain-connector-evm"
import { chaindataProvider } from "./chaindata"

export const chainConnectors = { substrate: chainConnector, evm: chainConnectorEvm }
export const balanceModules = defaultBalanceModules.map((mod) =>
  mod({ chainConnectors, chaindataProvider })
)
