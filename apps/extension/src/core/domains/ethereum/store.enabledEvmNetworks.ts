import { StorageProvider } from "@core/libs/Store"
import { EvmNetworkId, isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { CustomEvmNetwork, EvmNetwork } from "@talismn/chaindata-provider"

export type EnabledEvmNetworks = Record<EvmNetworkId, boolean>

/**
 * Stores the enabled state of each EVM network, if and only if the user has overriden it.
 * Enabled state is stored aside of the database table, to allow for bulk reset of the table on a regular basis
 * Default enabled state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class EnabledEvmNetworksStore extends StorageProvider<EnabledEvmNetworks> {
  constructor(initialData = {}) {
    super("enabledEvmNetworks", initialData)
  }

  async setEnabled(networkId: EvmNetworkId, enabled: boolean) {
    const enabledEvmNetworks = await this.get()
    await this.set({ ...enabledEvmNetworks, [networkId]: enabled })
  }

  async resetEnabled(networkId: EvmNetworkId) {
    await this.delete(networkId)
  }
}

export const enabledEvmNetworksStore = new EnabledEvmNetworksStore()

export const isEvmNetworkEnabled = (
  network: EvmNetwork | CustomEvmNetwork,
  enabledNetworks: EnabledEvmNetworks
) => {
  return enabledNetworks[network.id] ?? (isCustomEvmNetwork(network) || network.isDefault)
}
