import { ChainConnectorBtc } from "@talismn/chain-connectors"

import { chaindataProvider } from "./chaindata"

export const chainConnectorBtc = new ChainConnectorBtc(chaindataProvider)
