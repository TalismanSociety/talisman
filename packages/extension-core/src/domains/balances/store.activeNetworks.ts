import { Network, NetworkId } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../libs/Store"

export type ActiveNetworks = Record<NetworkId, boolean>

/**
 * Stores the active state of each substrate network, if and only if the user has overriden it.
 * Active state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default active state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class ActiveNetworksStore extends StorageProvider<ActiveNetworks> {
  constructor(initialData = {}) {
    super("activeNetworks", initialData)
  }

  async setActive(networkId: NetworkId, active: boolean) {
    const activeNetworks = await this.get()
    if (activeNetworks[networkId] === active) return
    await this.set({ ...activeNetworks, [networkId]: Boolean(active) })
  }

  async resetActive(networkId: NetworkId) {
    await this.delete(networkId)
  }
}

export const activeNetworksStore = new ActiveNetworksStore()

export const isNetworkActive = (network: Network, activeNetworks: ActiveNetworks) => {
  return Boolean(activeNetworks[network.id] ?? (network.isDefault && !network.isTestnet))
}
