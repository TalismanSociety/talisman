import { StorageProvider } from "@core/libs/Store"
import { EvmNetworkId, isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { CustomEvmNetwork, EvmNetwork } from "@talismn/chaindata-provider"

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
    const activeEvmNetworks = await this.get()
    await this.set({ ...activeEvmNetworks, [networkId]: active })
  }

  async resetActive(networkId: EvmNetworkId) {
    await this.delete(networkId)
  }
}

export const activeEvmNetworksStore = new ActiveEvmNetworksStore()

export const isEvmNetworkActive = (
  network: EvmNetwork | CustomEvmNetwork,
  activeNetworks: ActiveEvmNetworks
) => {
  return activeNetworks[network.id] ?? (isCustomEvmNetwork(network) || network.isDefault)
}
