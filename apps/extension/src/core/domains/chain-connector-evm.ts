import { chaindataProvider } from "@core/domains/chaindata"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"

export const chainConnectorEvm = new ChainConnectorEvm(chaindataProvider)
