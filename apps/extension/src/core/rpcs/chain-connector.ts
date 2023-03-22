import { chaindataProvider } from "@core/rpcs/chaindata"
import { ChainConnector } from "@talismn/chain-connector"
import { connectionMetaDb } from "@talismn/connection-meta"

export const chainConnector = new ChainConnector(chaindataProvider, connectionMetaDb)
