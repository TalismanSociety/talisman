import { StorageProvider } from "../../libs/Store"

type ActiveChains = Record<string, boolean>

/**
 * Stores the active state of each substrate network, if and only if the user has overriden it.
 * Active state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default active state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class ActiveChainsStore extends StorageProvider<ActiveChains> {
  constructor(initialData = {}) {
    super("activeChains", initialData)
  }

  async setActive(networkId: string, active: boolean) {
    const activeNetworks = await this.get()
    if (activeNetworks[networkId] === active) return
    await this.set({ ...activeNetworks, [networkId]: active })
  }

  async resetActive(networkId: string) {
    await this.delete(networkId)
  }
}

/** @deprecated use activeNetworksStore */
export const activeChainsStore = new ActiveChainsStore()
