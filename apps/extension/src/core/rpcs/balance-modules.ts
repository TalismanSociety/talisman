import { chainConnector } from "@core/rpcs/chain-connector"
import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { defaultBalanceModules } from "@talismn/balances"

export const chainConnectors = { substrate: chainConnector, evm: chainConnectorEvm }
export const balanceModules = defaultBalanceModules.map((mod) =>
  mod({ chainConnectors, chaindataProvider })
)
