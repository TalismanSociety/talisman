import { API_KEY_ONFINALITY } from "@core/constants"
import { chaindataProvider } from "@core/rpcs/chaindata"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"

export const chainConnectorEvm = new ChainConnectorEvm(chaindataProvider, {
  onfinalityApiKey: API_KEY_ONFINALITY,
})
