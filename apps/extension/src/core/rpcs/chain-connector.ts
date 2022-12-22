import { chaindataProvider } from "@core/rpcs/chaindata"
import { ChainConnector } from "@talismn/chain-connector"

export const chainConnector = new ChainConnector(chaindataProvider)
