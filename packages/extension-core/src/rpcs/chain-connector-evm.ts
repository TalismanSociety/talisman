import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { IChaindataEvmNetworkProvider, IChaindataTokenProvider } from "@talismn/chaindata-provider"

import { chaindataProvider } from "./chaindata"

export const chainConnectorEvm = new ChainConnectorEvm(
  // TODO fix this typing issue (error on prod builds)
  chaindataProvider as IChaindataEvmNetworkProvider & IChaindataTokenProvider
)
