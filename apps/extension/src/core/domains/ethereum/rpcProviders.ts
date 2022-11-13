// TODO: Replace all users of this with an instance of ChainConnectorEvm

import { chainConnectorEvm } from "@core/domains/chain-connector-evm"
import type { providers } from "ethers"

import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "./types"

export type GetProviderOptions = {
  /** If true, returns a provider which will batch requests */
  batch?: boolean
}

// TODO: Refactor any code which uses this function to directly
//       call methods on `chainConnectorEvm` instead!
export const getProviderForEthereumNetwork = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
): providers.JsonRpcProvider | null => {
  return chainConnectorEvm.getProviderForEvmNetwork(ethereumNetwork, { batch })
}

// TODO: Refactor any code which uses this function to directly
//       call methods on `chainConnectorEvm` instead!
export const getProviderForEvmNetworkId = async (
  ethereumNetworkId: EvmNetworkId,
  { batch }: GetProviderOptions = {}
): Promise<providers.JsonRpcProvider | null> => {
  return await chainConnectorEvm.getProviderForEvmNetworkId(ethereumNetworkId, { batch })
}
