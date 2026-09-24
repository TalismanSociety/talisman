import type { EthNetworkId } from "@talismn/chaindata-provider"

import { StorageProvider } from "../../../libs/Store"

type ActiveEvmNetworks = Record<EthNetworkId, boolean>

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
}

/** @deprecated use activeNetworksStore */
export const activeEvmNetworksStore = new ActiveEvmNetworksStore()
