import { StorageProvider } from "@core/libs/Store"
import {
  Chain,
  ChainId,
  CustomChain,
  EvmNetworkId,
  isCustomChain,
} from "@talismn/chaindata-provider"

export type EnabledChains = Record<ChainId, boolean>

/**
 * Stores the enabled state of each substrate network, if and only if the user has overriden it.
 * Default enabled state is stored in the chaindata-provider, in the isDefault property.
 * We only store overrides here to reduce storage consumption.
 */
class EnabledChainsStore extends StorageProvider<EnabledChains> {
  constructor(initialData = {}) {
    super("enabledChains", initialData)
  }

  async setEnabled(networkId: EvmNetworkId, enabled: boolean) {
    const enabledNetworks = await this.get()
    await this.set({ ...enabledNetworks, [networkId]: enabled })
  }
}

export const enabledChainsStore = new EnabledChainsStore()

export const isChainEnabled = (network: Chain | CustomChain, enabledNetworks: EnabledChains) => {
  return enabledNetworks[network.id] ?? (isCustomChain(network) || network.isDefault)
}
