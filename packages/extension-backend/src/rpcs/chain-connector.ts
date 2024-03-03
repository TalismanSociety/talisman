import { ChainConnector } from "@talismn/chain-connector"
import { connectionMetaDb } from "@talismn/connection-meta"

import { chaindataProvider } from "../rpcs/chaindata"

export const chainConnector = new ChainConnector(chaindataProvider, connectionMetaDb)
