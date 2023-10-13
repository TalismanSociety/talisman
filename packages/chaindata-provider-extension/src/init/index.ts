import { Chain, EvmNetwork } from "@talismn/chaindata-provider"

// These json files are generated by a script.
// Update them by running the following command:
// yarn workspace @talismn/chaindata-provider-extension generate-init-data
import initChainsResponse from "./chains.json"
import initEvmNetworksResponse from "./evm-networks.json"

export const fetchInitChains = async () => initChainsResponse as Chain[]

// TODO remove the .map() after fixing init data
export const fetchInitEvmNetworks = async () =>
  initEvmNetworksResponse.map((n) => ({
    ...n,
    isDefault: (n as any).isDefault === undefined ? true : (n as any).isDefault,
  }))
