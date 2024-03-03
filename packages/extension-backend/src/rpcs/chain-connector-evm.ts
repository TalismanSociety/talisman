import { ChainConnectorEvm } from "@talismn/chain-connector-evm"

import { chaindataProvider } from "../rpcs/chaindata"

export const chainConnectorEvm = new ChainConnectorEvm(chaindataProvider)
