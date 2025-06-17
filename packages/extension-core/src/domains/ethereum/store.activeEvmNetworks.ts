import { EthNetwork, EvmNetworkId } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"

export type ActiveEvmNetworks = Record<EvmNetworkId, boolean>

/**
 * Stores the active state of each EVM network, if and only if the user has overriden it.
 * Active state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default active state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class ActiveEvmNetworksStore extends StorageProvider<ActiveEvmNetworks> {
  constructor(initialData = {}) {
    super("activeEvmNetworks", initialData)
  }

  async setActive(networkId: EvmNetworkId, active: boolean) {
    const activeNetworks = await this.get()
    if (activeNetworks[networkId] === active) return
    return await this.mutate((activeEvmNetworks) => ({ ...activeEvmNetworks, [networkId]: active }))
  }

  async resetActive(networkId: EvmNetworkId) {
    await this.delete(networkId)
  }
}

/** @deprecated use activeNetworksStore */
export const activeEvmNetworksStore = new ActiveEvmNetworksStore()

/** @deprecated use isNetworkActive */
export const isEvmNetworkActive = (network: EthNetwork, activeNetworks: ActiveEvmNetworks) => {
  return (
    activeNetworks[network.id] ?? (network.isDefault && !network.isTestnet)
    // (isCustomEvmNetwork(network) || )
  )
}
