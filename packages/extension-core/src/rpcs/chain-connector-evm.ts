import { ChainConnectorEvm } from "@talismn/chain-connector-evm"

import { chaindataProvider } from "./chaindata"

export const chainConnectorEvm = new ChainConnectorEvm(chaindataProvider)
