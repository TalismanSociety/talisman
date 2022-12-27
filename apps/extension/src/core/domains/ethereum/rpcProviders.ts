// TODO: Replace all users of this with an instance of ChainConnectorEvm

import { chainConnectorEvm } from "@core/rpcs/chain-connector-evm"
import type { GetProviderOptions } from "@talismn/chain-connector-evm"
import type { ethers } from "ethers"

import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "./types"

export type { GetProviderOptions } from "@talismn/chain-connector-evm"

// TODO: Refactor any code which uses this function to directly
//       call methods on `chainConnectorEvm` instead!
export const getProviderForEthereumNetwork = (
  ethereumNetwork: EvmNetwork | CustomEvmNetwork,
  { batch }: GetProviderOptions = {}
): Promise<ethers.providers.JsonRpcProvider | null> => {
  return chainConnectorEvm.getProviderForEvmNetwork(ethereumNetwork, { batch })
}

// TODO: Refactor any code which uses this function to directly
//       call methods on `chainConnectorEvm` instead!
export const getProviderForEvmNetworkId = async (
  ethereumNetworkId: EvmNetworkId,
  { batch }: GetProviderOptions = {}
): Promise<ethers.providers.JsonRpcProvider | null> => {
  return await chainConnectorEvm.getProviderForEvmNetworkId(ethereumNetworkId, { batch })
}
