import { StorageProvider } from "@core/libs/Store"
import { Chain, ChainId, CustomChain, isCustomChain } from "@talismn/chaindata-provider"

export type EnabledChains = Record<ChainId, boolean>

/**
 * Stores the enabled state of each substrate network, if and only if the user has overriden it.
 * Enabled state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default enabled state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class EnabledChainsStore extends StorageProvider<EnabledChains> {
  constructor(initialData = {}) {
    super("enabledChains", initialData)
  }

  async setEnabled(networkId: ChainId, enabled: boolean) {
    const enabledNetworks = await this.get()
    await this.set({ ...enabledNetworks, [networkId]: enabled })
  }
}

export const enabledChainsStore = new EnabledChainsStore()

export const isChainEnabled = (network: Chain | CustomChain, enabledNetworks: EnabledChains) => {
  return enabledNetworks[network.id] ?? (isCustomChain(network) || network.isDefault)
}
