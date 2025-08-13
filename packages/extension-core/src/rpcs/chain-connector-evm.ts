import { ChainConnectorEth } from "@talismn/chain-connectors"

import { chaindataProvider } from "./chaindata"

export const chainConnectorEvm = new ChainConnectorEth(chaindataProvider)
