import { chaindataProvider } from "@core/domains/chaindata"
import { ChainConnector } from "@talismn/chain-connector"

export const chainConnector = new ChainConnector(chaindataProvider)
