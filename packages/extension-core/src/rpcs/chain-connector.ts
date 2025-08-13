import { ChainConnectorDot } from "@talismn/chain-connectors"
import { connectionMetaDb } from "@talismn/connection-meta"

import { chaindataProvider } from "./chaindata"

export const chainConnector = new ChainConnectorDot(chaindataProvider, connectionMetaDb)
