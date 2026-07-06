import { ChainConnectorDot } from "@talismn/chain-connectors"

import { chaindataProvider } from "./chaindata"

export const chainConnector = new ChainConnectorDot(chaindataProvider)
